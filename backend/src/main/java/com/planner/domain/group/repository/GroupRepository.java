package com.planner.domain.group.repository;

import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupInvite;
import com.planner.domain.group.model.GroupIntro;
import com.planner.domain.group.model.GroupJoinRequest;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.model.GroupNotice;
import com.planner.global.config.AwsProperties;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorPageResult;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 그룹, 멤버, 초대코드를 단일 DynamoDB 테이블에서 조회한다.
 */
@Repository
public class GroupRepository {

    private final DynamoDbTable<Group> groupTable;
    private final DynamoDbTable<GroupIntro> introTable;
    private final DynamoDbTable<GroupMember> memberTable;
    private final DynamoDbTable<GroupInvite> inviteTable;
    private final DynamoDbTable<GroupJoinRequest> joinRequestTable;
    private final DynamoDbTable<GroupNotice> noticeTable;
    private final DynamoDbIndex<GroupMember> userGroupsIndex;
    private final DynamoDbIndex<Group> publicGroupsIndex;
    private final DynamoDbClient dynamoDbClient;
    private final String tableName;

    public GroupRepository(DynamoDbEnhancedClient client, DynamoDbClient dynamoDbClient, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.tableName = prefix + "main";
        this.groupTable = client.table(tableName, TableSchema.fromBean(Group.class));
        this.introTable = client.table(tableName, TableSchema.fromBean(GroupIntro.class));
        this.memberTable = client.table(tableName, TableSchema.fromBean(GroupMember.class));
        this.inviteTable = client.table(tableName, TableSchema.fromBean(GroupInvite.class));
        this.joinRequestTable = client.table(tableName, TableSchema.fromBean(GroupJoinRequest.class));
        this.noticeTable = client.table(tableName, TableSchema.fromBean(GroupNotice.class));
        this.userGroupsIndex = memberTable.index("GSI2");
        this.publicGroupsIndex = groupTable.index("GSI3");
        this.dynamoDbClient = dynamoDbClient;
    }

    public void saveGroup(Group group) {
        groupTable.putItem(group);
    }

    public Optional<Group> findGroupById(String groupId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("METADATA").build();
        return Optional.ofNullable(groupTable.getItem(key));
    }

    public Optional<GroupIntro> findIntro(String groupId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("INTRO").build();
        return Optional.ofNullable(introTable.getItem(key));
    }

    public void saveIntro(GroupIntro intro) {
        introTable.putItem(intro);
    }

    public void saveNotice(GroupNotice notice) {
        noticeTable.putItem(notice);
    }

    public List<GroupNotice> findNoticesByGroupId(String groupId, int limit) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("GROUP#" + groupId).sortValue("NOTICE#")
                ))
                .scanIndexForward(false);

        if (limit > 0) request.limit(limit);

        Iterator<Page<GroupNotice>> pages = noticeTable.query(request.build()).iterator();
        if (!pages.hasNext()) {
            return List.of();
        }
        return pages.next().items();
    }

    public void deleteGroup(String groupId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("METADATA").build();
        groupTable.deleteItem(key);
    }

    public boolean saveInviteIfAbsent(GroupInvite invite) {
        try {
            // 초대코드는 별도 매핑 아이템을 조건부 저장해 scan 없이 중복을 막는다.
            dynamoDbClient.putItem(PutItemRequest.builder()
                    .tableName(tableName)
                    .item(Map.of(
                            "PK", AttributeValue.builder().s(invite.getPk()).build(),
                            "SK", AttributeValue.builder().s(invite.getSk()).build(),
                            "inviteCode", AttributeValue.builder().s(invite.getInviteCode()).build(),
                            "groupId", AttributeValue.builder().s(invite.getGroupId()).build(),
                            "createdAt", AttributeValue.builder().s(invite.getCreatedAt()).build()
                    ))
                    .conditionExpression("attribute_not_exists(PK)")
                    .build());
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false;
        }
    }

    public Optional<GroupInvite> findInvite(String inviteCode) {
        var key = Key.builder().partitionValue("INVITE#" + inviteCode).sortValue("METADATA").build();
        return Optional.ofNullable(inviteTable.getItem(key));
    }

    public void deleteInvite(String inviteCode) {
        var key = Key.builder().partitionValue("INVITE#" + inviteCode).sortValue("METADATA").build();
        inviteTable.deleteItem(key);
    }

    public void updateMemberCount(String groupId, int delta) {
        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s("GROUP#" + groupId).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .updateExpression("ADD memberCount :delta")
                .expressionAttributeValues(Map.of(
                        ":delta", AttributeValue.builder().n(String.valueOf(delta)).build()
                ))
                .build());
    }

    public void setMemberCount(String groupId, int count) {
        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s("GROUP#" + groupId).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .updateExpression("SET memberCount = :count")
                .expressionAttributeValues(Map.of(
                        ":count", AttributeValue.builder().n(String.valueOf(Math.max(0, count))).build()
                ))
                .build());
    }

    public void updateGroupImageFields(Group group) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":imageId", AttributeValue.builder().s(group.getImageId()).build());
        values.put(":imageStatus", AttributeValue.builder().s(group.getImageStatus()).build());
        values.put(":updatedAt", AttributeValue.builder().s(group.getUpdatedAt()).build());
        values.put(":completed", AttributeValue.builder().s("COMPLETED").build());

        Map<String, String> names = new HashMap<>();
        names.put("#imageStatus", "imageStatus");

        StringBuilder updateExpression = new StringBuilder(
                "SET imageId = :imageId, #imageStatus = :imageStatus, updatedAt = :updatedAt"
        );
        // Lambda 완료 업데이트와 폼 저장 업데이트가 서로 다른 필드만 보낼 수 있어 동적으로 구성한다.
        if (group.getImageUploadKey() != null && !group.getImageUploadKey().isBlank()) {
            updateExpression.append(", imageUploadKey = :imageUploadKey");
            values.put(":imageUploadKey", AttributeValue.builder().s(group.getImageUploadKey()).build());
        }
        if (group.getImageObjectKey() != null && !group.getImageObjectKey().isBlank()) {
            updateExpression.append(", imageObjectKey = :imageObjectKey");
            values.put(":imageObjectKey", AttributeValue.builder().s(group.getImageObjectKey()).build());
        }
        if (group.getImageUrl() != null && !group.getImageUrl().isBlank()) {
            updateExpression.append(", imageUrl = :imageUrl");
            values.put(":imageUrl", AttributeValue.builder().s(group.getImageUrl()).build());
        }
        if (group.getThumbnailObjectKey() != null && !group.getThumbnailObjectKey().isBlank()) {
            updateExpression.append(", thumbnailObjectKey = :thumbnailObjectKey");
            values.put(":thumbnailObjectKey", AttributeValue.builder().s(group.getThumbnailObjectKey()).build());
        }
        if (group.getThumbnailUrl() != null && !group.getThumbnailUrl().isBlank()) {
            updateExpression.append(", thumbnailUrl = :thumbnailUrl");
            values.put(":thumbnailUrl", AttributeValue.builder().s(group.getThumbnailUrl()).build());
        }

        try {
            dynamoDbClient.updateItem(UpdateItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s("GROUP#" + group.getId()).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()
                    ))
                    .updateExpression(updateExpression.toString())
                    .conditionExpression("attribute_exists(PK) AND (attribute_not_exists(#imageStatus) OR #imageStatus <> :completed OR imageId <> :imageId)")
                    .expressionAttributeNames(names)
                    .expressionAttributeValues(values)
                    .build());
        } catch (ConditionalCheckFailedException ignored) {
            // Lambda가 먼저 COMPLETED를 저장한 경우 처리 중 상태로 되돌리지 않는다.
        }
    }

    public void saveMember(GroupMember member) {
        memberTable.putItem(member);
    }

    public List<GroupMember> findMembersByGroupId(String groupId) {
        return findMembersByGroupId(groupId, 0);
    }

    public List<GroupMember> findMembersByGroupId(String groupId, int limit) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("GROUP#" + groupId).sortValue("MEMBER#")
                ));
        if (limit > 0) request.limit(limit);

        return memberTable.query(request.build()).stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());
    }

    public Optional<GroupMember> findMember(String groupId, String userId) {
        var key = Key.builder()
                .partitionValue("GROUP#" + groupId)
                .sortValue("MEMBER#" + userId)
                .build();
        return Optional.ofNullable(memberTable.getItem(key));
    }

    public void deleteMember(String groupId, String userId) {
        var key = Key.builder()
                .partitionValue("GROUP#" + groupId)
                .sortValue("MEMBER#" + userId)
                .build();
        memberTable.deleteItem(key);
    }

    public List<GroupMember> findGroupsByUserId(String userId) {
        return findGroupsByUserIdPaged(userId, 0, null).getItems();
    }

    public CursorPageResult<GroupMember> findGroupsByUserIdPaged(String userId, int limit, Cursor cursor) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(
                        k -> k.partitionValue("USER#" + userId)
                ));

        if (limit > 0) request.limit(limit);
        if (cursor != null) request.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<GroupMember>> pages = userGroupsIndex.query(request.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<GroupMember>builder().items(List.of()).build();
        }

        Page<GroupMember> page = pages.next();
        Cursor nextCursor = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()
                ? fromAttributeMap(page.lastEvaluatedKey()) : null;

        return CursorPageResult.<GroupMember>builder()
                .items(page.items())
                .nextCursor(nextCursor)
                .build();
    }

    public CursorPageResult<Group> findPublicGroupsPaged(int limit, Cursor cursor) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(
                        k -> k.partitionValue("GROUP#PUBLIC")
                ))
                .scanIndexForward(false);

        if (limit > 0) request.limit(limit);
        if (cursor != null) request.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<Group>> pages = publicGroupsIndex.query(request.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<Group>builder().items(List.of()).build();
        }

        Page<Group> page = pages.next();
        Cursor nextCursor = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()
                ? fromAttributeMap(page.lastEvaluatedKey()) : null;

        return CursorPageResult.<Group>builder()
                .items(page.items())
                .nextCursor(nextCursor)
                .build();
    }

    public void saveJoinRequest(GroupJoinRequest request) {
        joinRequestTable.putItem(request);
    }

    public Optional<GroupJoinRequest> findJoinRequest(String groupId, String userId) {
        var key = Key.builder()
                .partitionValue("GROUP#" + groupId)
                .sortValue("JOIN_REQUEST#" + userId)
                .build();
        return Optional.ofNullable(joinRequestTable.getItem(key));
    }

    public List<GroupJoinRequest> findJoinRequestsByGroupId(String groupId) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("GROUP#" + groupId).sortValue("JOIN_REQUEST#")
                ))
                .scanIndexForward(false)
                .build();
        return joinRequestTable.query(request).stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());
    }

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
