package com.planner.domain.schedule.model;

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
public class Schedule {

    private String pk;
    private String sk;
    private String id;
    private String userId;
    private String title;
    private String content;
    private String category;
    private Boolean isImportant;
    private String startTime;
    private String endTime;
    private Double duration;
    private Boolean isCompleted;
    private Boolean hasAlarm;
    private String groupId;
    private String imageUrl;
    private String imageId;
    private String imageStatus;
    private String imageUploadKey;
    private String imageObjectKey;
    private String createdAt;
    private String updatedAt;

    private String gsi1pk;
    private String gsi1sk;
    private String gsi4pk;
    private String gsi4sk;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }

    @DynamoDbSecondaryPartitionKey(indexNames = "GSI1")
    @DynamoDbAttribute("GSI1PK")
    public String getGsi1pk() { return gsi1pk; }

    @DynamoDbSecondarySortKey(indexNames = "GSI1")
    @DynamoDbAttribute("GSI1SK")
    public String getGsi1sk() { return gsi1sk; }

    @DynamoDbSecondaryPartitionKey(indexNames = "GSI4")
    @DynamoDbAttribute("GSI4PK")
    public String getGsi4pk() { return gsi4pk; }

    @DynamoDbSecondarySortKey(indexNames = "GSI4")
    @DynamoDbAttribute("GSI4SK")
    public String getGsi4sk() { return gsi4sk; }
}
