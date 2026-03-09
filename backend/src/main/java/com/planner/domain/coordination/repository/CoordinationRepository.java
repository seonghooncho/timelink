package com.planner.domain.coordination.repository;

import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.model.CoordinationResponse;
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
public class CoordinationRepository {

    private final DynamoDbTable<Coordination> coordTable;
    private final DynamoDbTable<CoordinationResponse> respTable;

    public CoordinationRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.coordTable = client.table(prefix + "main", TableSchema.fromBean(Coordination.class));
        this.respTable = client.table(prefix + "main", TableSchema.fromBean(CoordinationResponse.class));
    }

    public void saveCoordination(Coordination coord) {
        coordTable.putItem(coord);
    }

    public Optional<Coordination> findCoordination(String groupId, String coordId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("COORD#" + coordId).build();
        return Optional.ofNullable(coordTable.getItem(key));
    }

    /** 전체 조회 (하위 호환) */
    public List<Coordination> findByGroupId(String groupId) {
        return findByGroupIdPaged(groupId, 0, null).getItems();
    }

    /** 커서 기반 페이지네이션 조회 */
    public CursorPageResult<Coordination> findByGroupIdPaged(String groupId, int limit, Cursor cursor) {
        var builder = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("GROUP#" + groupId).sortValue("COORD#")
                ))
                .scanIndexForward(false);

        if (limit > 0) builder.limit(limit);
        if (cursor != null) builder.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<Coordination>> pages = coordTable.query(builder.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<Coordination>builder().items(List.of()).build();
        }

        Page<Coordination> page = pages.next();
        Cursor nextCursor = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()
                ? fromAttributeMap(page.lastEvaluatedKey()) : null;

        return CursorPageResult.<Coordination>builder()
                .items(page.items())
                .nextCursor(nextCursor)
                .build();
    }

    public void deleteCoordination(String groupId, String coordId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("COORD#" + coordId).build();
        coordTable.deleteItem(key);
    }

    public void saveResponse(CoordinationResponse resp) {
        respTable.putItem(resp);
    }

    public List<CoordinationResponse> findResponses(String coordId) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(
                        k -> k.partitionValue("COORD#" + coordId)
                ))
                .build();
        return respTable.query(request).stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());
    }

    public List<CoordinationResponse> findUserResponses(String coordId, String userId) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("COORD#" + coordId).sortValue("RESP#" + userId + "#")
                ))
                .build();
        return respTable.query(request).stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());
    }

    public void deleteResponse(String coordId, String sk) {
        var key = Key.builder().partitionValue("COORD#" + coordId).sortValue(sk).build();
        respTable.deleteItem(key);
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
