package com.planner.domain.group.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean
public class GroupMember {

    private String pk;
    private String sk;
    private String id;
    private String groupId;
    private String userId;
    private String role;
    private String nickname;
    private String avatarUrl;
    private String imageId;
    private String imageStatus;
    private String imageUploadKey;
    private String imageObjectKey;
    private String thumbnailUrl;
    private String thumbnailObjectKey;
    private String joinedAt;

    private String gsi2pk;
    private String gsi2sk;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }

    @DynamoDbSecondaryPartitionKey(indexNames = "GSI2")
    @DynamoDbAttribute("GSI2PK")
    public String getGsi2pk() { return gsi2pk; }

    @DynamoDbSecondarySortKey(indexNames = "GSI2")
    @DynamoDbAttribute("GSI2SK")
    public String getGsi2sk() { return gsi2sk; }
}
