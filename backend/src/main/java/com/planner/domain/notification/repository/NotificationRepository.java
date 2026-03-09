package com.planner.domain.notification.repository;

import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.NotificationSettings;
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
public class NotificationRepository {

    private final DynamoDbTable<Notification> notifTable;
    private final DynamoDbTable<NotificationSettings> settingsTable;

    public NotificationRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.notifTable = client.table(prefix + "main", TableSchema.fromBean(Notification.class));
        this.settingsTable = client.table(prefix + "main", TableSchema.fromBean(NotificationSettings.class));
    }

    public void saveNotification(Notification notification) {
        notifTable.putItem(notification);
    }

    /** 전체 조회 (하위 호환) */
    public List<Notification> findByUserId(String userId) {
        return findByUserIdPaged(userId, 0, null).getItems();
    }

    /** 커서 기반 페이지네이션 조회 */
    public CursorPageResult<Notification> findByUserIdPaged(String userId, int limit, Cursor cursor) {
        var builder = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("USER#" + userId).sortValue("NOTIF#")
                ))
                .scanIndexForward(false);

        if (limit > 0) builder.limit(limit);
        if (cursor != null) builder.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<Notification>> pages = notifTable.query(builder.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<Notification>builder().items(List.of()).build();
        }

        Page<Notification> page = pages.next();
        Cursor nextCursor = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()
                ? fromAttributeMap(page.lastEvaluatedKey()) : null;

        return CursorPageResult.<Notification>builder()
                .items(page.items())
                .nextCursor(nextCursor)
                .build();
    }

    /** notifId로 직접 키 조회 (O(1)) */
    public Optional<Notification> findByUserIdAndNotifId(String userId, String notifId) {
        var key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue("NOTIF#" + notifId)
                .build();
        return Optional.ofNullable(notifTable.getItem(key));
    }

    public void deleteNotification(String userId, String notifSk) {
        var key = Key.builder().partitionValue("USER#" + userId).sortValue(notifSk).build();
        notifTable.deleteItem(key);
    }

    public void saveSettings(NotificationSettings settings) {
        settingsTable.putItem(settings);
    }

    public Optional<NotificationSettings> findSettings(String userId) {
        var key = Key.builder().partitionValue("USER#" + userId).sortValue("NOTIF_SETTINGS").build();
        return Optional.ofNullable(settingsTable.getItem(key));
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
