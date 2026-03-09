package com.planner.domain.group.repository;

import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ExecuteStatementRequest;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;
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
        var request = ExecuteStatementRequest.builder()
                .statement("SELECT * FROM \"" + tableName + "\" WHERE SK=? AND inviteCode=?")
                .parameters(
                        AttributeValue.builder().s("METADATA").build(),
                        AttributeValue.builder().s(inviteCode).build()
                )
                .limit(1)
                .build();
        return dynamoDbClient.executeStatement(request).items().stream()
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
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(
                        k -> k.partitionValue("USER#" + userId)
                ))
                .build();
        return userGroupsIndex.query(request).stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());
    }
}
