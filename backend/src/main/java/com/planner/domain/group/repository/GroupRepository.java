package com.planner.domain.group.repository;

import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.global.config.AwsProperties;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorPageResult;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;
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

@Repository
public class GroupRepository {

    private final DynamoDbTable<Group> groupTable;
    private final DynamoDbTable<GroupMember> memberTable;
    private final DynamoDbIndex<GroupMember> userGroupsIndex;
    private final DynamoDbClient dynamoDbClient;
    private final TableSchema<Group> groupSchema;
    private final String tableName;

    public GroupRepository(DynamoDbEnhancedClient client, DynamoDbClient dynamoDbClient, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.tableName = prefix + "main";
        this.groupSchema = TableSchema.fromBean(Group.class);
        this.groupTable = client.table(tableName, groupSchema);
        this.memberTable = client.table(tableName, TableSchema.fromBean(GroupMember.class));
        this.userGroupsIndex = memberTable.index("GSI2");
        this.dynamoDbClient = dynamoDbClient;
    }

    public void saveGroup(Group group) {
        groupTable.putItem(group);
    }

    public Optional<Group> findGroupById(String groupId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("METADATA").build();
        return Optional.ofNullable(groupTable.getItem(key));
    }

    public void deleteGroup(String groupId) {
        var key = Key.builder().partitionValue("GROUP#" + groupId).sortValue("METADATA").build();
        groupTable.deleteItem(key);
    }

    public Optional<Group> findByInviteCode(String inviteCode) {
        var request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("#sk = :metadata AND #inviteCode = :inviteCode")
                .expressionAttributeNames(Map.of(
                        "#sk", "SK",
                        "#inviteCode", "inviteCode"
                ))
                .expressionAttributeValues(Map.of(
                        ":metadata", AttributeValue.builder().s("METADATA").build(),
                        ":inviteCode", AttributeValue.builder().s(inviteCode).build()
                ))
                .build();
        return dynamoDbClient.scan(request).items().stream()
                .findFirst()
                .map(groupSchema::mapToItem);
    }

    public void saveMember(GroupMember member) {
        memberTable.putItem(member);
    }

    public List<GroupMember> findMembersByGroupId(String groupId) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("GROUP#" + groupId).sortValue("MEMBER#")
                ))
                .build();
        return memberTable.query(request).stream()
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
