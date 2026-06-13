package com.planner.domain.schedule.repository;

import com.planner.domain.schedule.model.Schedule;
import com.planner.domain.schedule.model.GroupScheduleParticipant;
import com.planner.global.config.AwsProperties;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorPageResult;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.*;
import java.util.stream.Collectors;

@Repository
public class ScheduleRepository {

    private final DynamoDbTable<Schedule> table;
    private final DynamoDbTable<GroupScheduleParticipant> participantTable;
    private final DynamoDbIndex<Schedule> timeIndex;
    private final DynamoDbIndex<Schedule> groupTimeIndex;

    public ScheduleRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.table = client.table(prefix + "main", TableSchema.fromBean(Schedule.class));
        this.participantTable = client.table(prefix + "main", TableSchema.fromBean(GroupScheduleParticipant.class));
        this.timeIndex = table.index("GSI1");
        this.groupTimeIndex = table.index("GSI4");
    }

    public void save(Schedule schedule) {
        table.putItem(schedule);
    }

    public void saveParticipant(GroupScheduleParticipant participant) {
        participantTable.putItem(participant);
    }

    public List<GroupScheduleParticipant> findParticipantsByGroupScheduleId(String groupScheduleId) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("GROUP_SCHEDULE#" + groupScheduleId).sortValue("PARTICIPANT#")
                ))
                .build();
        return participantTable.query(request).stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());
    }

    public Optional<Schedule> findByUserIdAndScheduleId(String userId, String scheduleId) {
        var key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue("SCHEDULE#" + scheduleId)
                .build();
        return Optional.ofNullable(table.getItem(key));
    }

    /** 전체 조회 (페이지네이션 없음 — 하위 호환) */
    public List<Schedule> findByUserId(String userId) {
        return findByUserIdPaged(userId, 0, null).getItems();
    }

    /** 커서 기반 페이지네이션 조회 */
    public CursorPageResult<Schedule> findByUserIdPaged(String userId, int limit, Cursor cursor) {
        var builder = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("USER#" + userId).sortValue("SCHEDULE#")
                ))
                .scanIndexForward(false);

        if (limit > 0) builder.limit(limit);
        if (cursor != null) builder.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<Schedule>> pages = table.query(builder.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<Schedule>builder().items(List.of()).build();
        }

        Page<Schedule> page = pages.next();
        Cursor nextCursor = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()
                ? fromAttributeMap(page.lastEvaluatedKey()) : null;

        return CursorPageResult.<Schedule>builder()
                .items(page.items())
                .nextCursor(nextCursor)
                .build();
    }

    /** 시간 범위 조회 (GSI1, 페이지네이션) */
    public CursorPageResult<Schedule> findByUserIdAndTimeRangePaged(String userId, String startTime, String endTime, int limit, Cursor cursor) {
        var builder = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBetween(
                        k -> k.partitionValue("USER#" + userId).sortValue(startTime),
                        k -> k.partitionValue("USER#" + userId).sortValue(endTime)
                ));

        if (limit > 0) builder.limit(limit);
        if (cursor != null) builder.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<Schedule>> pages = timeIndex.query(builder.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<Schedule>builder().items(List.of()).build();
        }

        Page<Schedule> page = pages.next();
        Cursor nextCursor = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()
                ? fromAttributeMap(page.lastEvaluatedKey()) : null;

        return CursorPageResult.<Schedule>builder()
                .items(page.items())
                .nextCursor(nextCursor)
                .build();
    }

    /** 하위 호환용 */
    public List<Schedule> findByUserIdAndTimeRange(String userId, String startTime, String endTime) {
        return findByUserIdAndTimeRangePaged(userId, startTime, endTime, 0, null).getItems();
    }

    public Optional<Schedule> findNextByGroupId(String groupId, String fromStartTime) {
        return findUpcomingByGroupId(groupId, fromStartTime, 1).stream().findFirst();
    }

    public List<Schedule> findUpcomingByGroupId(String groupId, String fromStartTime, int limit) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortGreaterThanOrEqualTo(
                        k -> k.partitionValue("GROUP#" + groupId).sortValue("START#" + fromStartTime)
                ))
                .scanIndexForward(true)
                .limit(Math.max(1, limit))
                .build();

        Iterator<Page<Schedule>> pages = groupTimeIndex.query(request).iterator();
        if (!pages.hasNext()) {
            return List.of();
        }
        return pages.next().items();
    }

    public void delete(String userId, String scheduleId) {
        var key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue("SCHEDULE#" + scheduleId)
                .build();
        table.deleteItem(key);
    }

    public void deleteParticipant(String groupScheduleId, String userId) {
        var key = Key.builder()
                .partitionValue("GROUP_SCHEDULE#" + groupScheduleId)
                .sortValue("PARTICIPANT#" + userId)
                .build();
        participantTable.deleteItem(key);
    }

    // ── DynamoDB key ↔ Cursor 변환 ──

    private Map<String, AttributeValue> toAttributeMap(Cursor cursor) {
        Map<String, AttributeValue> map = new HashMap<>();
        cursor.getKeys().forEach((k, v) ->
                map.put(k, AttributeValue.builder().s(v).build()));
        return map;
    }

    private Cursor fromAttributeMap(Map<String, AttributeValue> lastKey) {
        Map<String, String> keys = new HashMap<>();
        lastKey.forEach((k, v) -> keys.put(k, v.s()));
        return Cursor.builder().keys(keys).build();
    }
}
