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
public class Group {

    private String pk;
    private String sk;
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private String imageId;
    private String imageStatus;
    private String imageUploadKey;
    private String imageObjectKey;
    private String createdBy;
    private String inviteCode;
    private Integer memberCount;
    private String createdAt;
    private String updatedAt;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }
}
