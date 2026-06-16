package com.planner.domain.analytics.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.analytics.dto.AnalyticsSummaryResDTO;
import com.planner.domain.analytics.support.ApiLatencyHistogram;
import com.planner.global.config.AnalyticsProperties;
import com.planner.global.config.AwsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
@RequiredArgsConstructor
public class AnalyticsRepository {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");
    private static final String META_PK = "ANALYTICS#META";
    private static final String TOTAL_USERS_SK = "TOTAL_USERS";

    private final DynamoDbClient dynamoDbClient;
    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    private final AwsProperties awsProperties;
    private final AnalyticsProperties analyticsProperties;

    public void incrementDailyEvent(String date, String eventName, Instant timestamp) {
        incrementCounter("ANALYTICS#DAY#" + date, "EVENT#" + eventName, timestamp);
    }

    public void incrementDailyFeature(String date, String feature, Instant timestamp) {
        incrementCounter("ANALYTICS#DAY#" + date, "FEATURE#" + feature, timestamp);
    }

    public void markActiveUser(String date, String userKey, Instant timestamp) {
        if (!StringUtils.hasText(userKey)) {
            return;
        }

        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":userKey", AttributeValue.builder().s(userKey).build());
        values.put(":firstSeenAt", AttributeValue.builder().s(timestamp.toString()).build());
        values.put(":lastSeenAt", AttributeValue.builder().s(timestamp.toString()).build());

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName())
                .key(key("ANALYTICS#ACTIVE#" + date, "USER#" + userKey))
                .updateExpression("SET userKey = :userKey, firstSeenAt = if_not_exists(firstSeenAt, :firstSeenAt), lastSeenAt = :lastSeenAt")
                .expressionAttributeValues(values)
                .build());
    }

    public void saveRecentError(String eventId, String timestamp, Map<String, Object> properties) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":eventId", AttributeValue.builder().s(eventId).build());
        values.put(":timestamp", AttributeValue.builder().s(timestamp).build());
        putString(values, ":feature", properties.get("feature"));
        putString(values, ":route", properties.get("route"));
        putString(values, ":errorCode", properties.get("error_code"));
        putString(values, ":severity", properties.get("severity"));

        String updateExpression = "SET eventId = :eventId, #ts = :timestamp"
                + (values.containsKey(":feature") ? ", feature = :feature" : "")
                + (values.containsKey(":route") ? ", route = :route" : "")
                + (values.containsKey(":errorCode") ? ", errorCode = :errorCode" : "")
                + (values.containsKey(":severity") ? ", severity = :severity" : "");

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName())
                .key(key("ANALYTICS#ERRORS", "TS#" + timestamp + "#EVENT#" + eventId))
                .updateExpression(updateExpression)
                .expressionAttributeNames(Map.of("#ts", "timestamp"))
                .expressionAttributeValues(values)
                .build());
    }

    public void recordApiLatency(
            String date,
            String method,
            String route,
            int status,
            long durationMs,
            Instant timestamp
    ) {
        if (!StringUtils.hasText(date) || !StringUtils.hasText(method) || !StringUtils.hasText(route)) {
            return;
        }

        String bucketAttribute = ApiLatencyHistogram.bucketAttribute(durationMs);
        String statusAttribute = statusAttribute(status);
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":one", AttributeValue.builder().n("1").build());
        values.put(":durationMs", AttributeValue.builder().n(Long.toString(Math.max(0, durationMs))).build());
        values.put(":method", AttributeValue.builder().s(method).build());
        values.put(":route", AttributeValue.builder().s(route).build());
        values.put(":updatedAt", AttributeValue.builder().s(timestamp.toString()).build());

        Map<String, String> names = new HashMap<>();
        names.put("#count", "count");
        names.put("#method", "method");
        names.put("#route", "route");
        names.put("#bucket", bucketAttribute);
        names.put("#status", statusAttribute);

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName())
                .key(key("ANALYTICS#API#DAY#" + date, "ROUTE#" + method + "#" + route))
                .updateExpression("SET #method = :method, #route = :route, updatedAt = :updatedAt "
                        + "ADD #count :one, totalMs :durationMs, #bucket :one, #status :one")
                .expressionAttributeNames(names)
                .expressionAttributeValues(values)
                .build());
    }

    public void incrementTotalUsers(Instant timestamp) {
        Map<String, AttributeValue> values = Map.of(
                ":zero", AttributeValue.builder().n("0").build(),
                ":one", AttributeValue.builder().n("1").build(),
                ":updatedAt", AttributeValue.builder().s(timestamp.toString()).build()
        );
        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName())
                .key(key(META_PK, TOTAL_USERS_SK))
                .updateExpression("SET #count = if_not_exists(#count, :zero) + :one, updatedAt = :updatedAt")
                .expressionAttributeNames(Map.of("#count", "count"))
                .expressionAttributeValues(values)
                .build());
    }

    public void putRawEvent(Map<String, Object> rawEvent, String date, String hour, String eventId) throws JsonProcessingException {
        if (!StringUtils.hasText(analyticsProperties.getRawBucketName())) {
            return;
        }

        String key = "analytics/raw/dt=" + date + "/hour=" + hour + "/" + eventId + ".json";
        String body = objectMapper.writeValueAsString(rawEvent);

        s3Client.putObject(PutObjectRequest.builder()
                        .bucket(analyticsProperties.getRawBucketName())
                        .key(key)
                        .contentType("application/json")
                        .serverSideEncryption(ServerSideEncryption.AES256)
                        .build(),
                RequestBody.fromString(body, StandardCharsets.UTF_8));
    }

    public long getTotalUsers() {
        Map<String, AttributeValue> item = dynamoDbClient.getItem(GetItemRequest.builder()
                        .tableName(tableName())
                        .key(key(META_PK, TOTAL_USERS_SK))
                        .consistentRead(false)
                        .build())
                .item();
        return toLong(item.get("count"));
    }

    public Map<String, Long> getDailyCounters(String date) {
        Map<String, Long> counters = new LinkedHashMap<>();
        queryPartition("ANALYTICS#DAY#" + date).forEach(item -> {
            String sk = stringValue(item.get("SK"));
            if (sk != null && sk.startsWith("EVENT#")) {
                counters.put(sk.substring("EVENT#".length()), toLong(item.get("count")));
            }
        });
        return counters;
    }

    public List<AnalyticsSummaryResDTO.FeatureUsageDTO> getTopFeatures(String date, int limit) {
        return queryPartition("ANALYTICS#DAY#" + date).stream()
                .filter(item -> {
                    String sk = stringValue(item.get("SK"));
                    return sk != null && sk.startsWith("FEATURE#");
                })
                .map(item -> AnalyticsSummaryResDTO.FeatureUsageDTO.builder()
                        .feature(stringValue(item.get("SK")).substring("FEATURE#".length()))
                        .count(toLong(item.get("count")))
                        .build())
                .sorted(Comparator.comparingLong(AnalyticsSummaryResDTO.FeatureUsageDTO::getCount).reversed())
                .limit(limit)
                .toList();
    }

    public List<AnalyticsSummaryResDTO.ApiPerformanceDTO> getApiPerformance(String date, int limit) {
        return queryPartition("ANALYTICS#API#DAY#" + date).stream()
                .map(this::toApiPerformance)
                .filter(metric -> metric.getCount() > 0)
                .sorted(Comparator
                        .comparingLong(AnalyticsSummaryResDTO.ApiPerformanceDTO::getP95Ms).reversed()
                        .thenComparing(Comparator.comparingLong(AnalyticsSummaryResDTO.ApiPerformanceDTO::getCount).reversed()))
                .limit(limit)
                .toList();
    }

    public ActiveUsersResult getActiveUsers(LocalDate endDate, int days) {
        Set<String> uniqueUserKeys = new HashSet<>();
        List<Long> todayDurations = new ArrayList<>();
        String today = endDate.toString();

        for (int i = 0; i < days; i += 1) {
            String date = endDate.minusDays(i).toString();
            List<Map<String, AttributeValue>> items = queryPartition("ANALYTICS#ACTIVE#" + date);
            items.forEach(item -> {
                String userKey = stringValue(item.get("userKey"));
                if (StringUtils.hasText(userKey)) {
                    uniqueUserKeys.add(userKey);
                }

                if (today.equals(date)) {
                    Long duration = activeDurationSeconds(item);
                    if (duration != null) {
                        todayDurations.add(duration);
                    }
                }
            });
        }

        double average = todayDurations.stream().mapToLong(Long::longValue).average().orElse(0d);
        return new ActiveUsersResult(uniqueUserKeys.size(), average);
    }

    public List<AnalyticsSummaryResDTO.RecentErrorDTO> getRecentErrors(int limit) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName())
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(":pk", AttributeValue.builder().s("ANALYTICS#ERRORS").build()))
                .scanIndexForward(false)
                .limit(limit)
                .build();

        return dynamoDbClient.query(request).items().stream()
                .map(item -> AnalyticsSummaryResDTO.RecentErrorDTO.builder()
                        .eventId(stringValue(item.get("eventId")))
                        .timestamp(stringValue(item.get("timestamp")))
                        .feature(stringValue(item.get("feature")))
                        .route(stringValue(item.get("route")))
                        .errorCode(stringValue(item.get("errorCode")))
                        .severity(stringValue(item.get("severity")))
                        .build())
                .toList();
    }

    private void incrementCounter(String pk, String sk, Instant timestamp) {
        Map<String, AttributeValue> values = Map.of(
                ":zero", AttributeValue.builder().n("0").build(),
                ":one", AttributeValue.builder().n("1").build(),
                ":updatedAt", AttributeValue.builder().s(timestamp.toString()).build()
        );

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName())
                .key(key(pk, sk))
                .updateExpression("SET #count = if_not_exists(#count, :zero) + :one, updatedAt = :updatedAt")
                .expressionAttributeNames(Map.of("#count", "count"))
                .expressionAttributeValues(values)
                .build());
    }

    private AnalyticsSummaryResDTO.ApiPerformanceDTO toApiPerformance(Map<String, AttributeValue> item) {
        long count = toLong(item.get("count"));
        long totalMs = toLong(item.get("totalMs"));
        Map<String, Long> buckets = new LinkedHashMap<>();
        ApiLatencyHistogram.BUCKETS.forEach(bucket ->
                buckets.put(bucket.attributeName(), toLong(item.get(bucket.attributeName()))));

        return AnalyticsSummaryResDTO.ApiPerformanceDTO.builder()
                .method(stringValue(item.get("method")))
                .route(stringValue(item.get("route")))
                .count(count)
                .averageMs(count == 0 ? 0 : Math.round((double) totalMs / count))
                .p50Ms(ApiLatencyHistogram.percentile(buckets, 0.50))
                .p95Ms(ApiLatencyHistogram.percentile(buckets, 0.95))
                .clientErrorCount(toLong(item.get("status4xx")))
                .serverErrorCount(toLong(item.get("status5xx")))
                .build();
    }

    private String statusAttribute(int status) {
        if (status >= 500) {
            return "status5xx";
        }
        if (status >= 400) {
            return "status4xx";
        }
        if (status >= 300) {
            return "status3xx";
        }
        return "status2xx";
    }

    private List<Map<String, AttributeValue>> queryPartition(String pk) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName())
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(":pk", AttributeValue.builder().s(pk).build()))
                .build();
        return dynamoDbClient.query(request).items();
    }

    private Long activeDurationSeconds(Map<String, AttributeValue> item) {
        try {
            String first = stringValue(item.get("firstSeenAt"));
            String last = stringValue(item.get("lastSeenAt"));
            if (!StringUtils.hasText(first) || !StringUtils.hasText(last)) {
                return null;
            }
            long seconds = Duration.between(Instant.parse(first), Instant.parse(last)).toSeconds();
            return Math.max(0, seconds);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private Map<String, AttributeValue> key(String pk, String sk) {
        return Map.of(
                "PK", AttributeValue.builder().s(pk).build(),
                "SK", AttributeValue.builder().s(sk).build()
        );
    }

    private void putString(Map<String, AttributeValue> values, String key, Object value) {
        if (value instanceof String s && StringUtils.hasText(s)) {
            values.put(key, AttributeValue.builder().s(s).build());
        }
    }

    private long toLong(AttributeValue value) {
        if (value == null || value.n() == null) {
            return 0L;
        }
        try {
            return Long.parseLong(value.n());
        } catch (NumberFormatException exception) {
            return 0L;
        }
    }

    private String stringValue(AttributeValue value) {
        return value == null ? null : value.s();
    }

    private String tableName() {
        return awsProperties.getDynamodb().getTablePrefix() + "main";
    }

    public record ActiveUsersResult(long count, double averageActivitySeconds) {
    }
}
