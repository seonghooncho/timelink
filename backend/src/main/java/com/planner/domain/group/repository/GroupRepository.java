package com.planner.domain.group.repository;

import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class GroupRepository {

    private final DynamoDbTable<Group> groupTable;
    private final DynamoDbTable<GroupMember> memberTable;
    private final DynamoDbIndex<GroupMember> userGroupsIndex;

    public GroupRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.groupTable = client.table(prefix + "main", TableSchema.fromBean(Group.class));
        this.memberTable = client.table(prefix + "main", TableSchema.fromBean(GroupMember.class));
        this.userGroupsIndex = memberTable.index("GSI2");
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

    /**
     * inviteCode로 그룹을 찾는다 (단건 스캔 — 그룹 수가 적으므로 허용 가능).
     * 규모가 커지면 GSI3(inviteCode → groupId) 추가를 권장.
     */
    public Optional<Group> findByInviteCode(String inviteCode) {
        var request = ScanEnhancedRequest.builder()
                .filterExpression(Expression.builder()
                        .expression("SK = :sk AND inviteCode = :code")
                        .putExpressionValue(":sk",
                                software.amazon.awssdk.services.dynamodb.model.AttributeValue.builder().s("METADATA").build())
                        .putExpressionValue(":code",
                                software.amazon.awssdk.services.dynamodb.model.AttributeValue.builder().s(inviteCode).build())
                        .build())
                .build();
        return groupTable.scan(request).stream()
                .flatMap(page -> page.items().stream())
                .findFirst();
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
