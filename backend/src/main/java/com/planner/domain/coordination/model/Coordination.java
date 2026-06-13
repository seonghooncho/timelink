package com.planner.domain.coordination.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean
public class Coordination {

    private String pk;
    private String sk;
    private String id;
    private String groupId;
    private String createdBy;
    private String title;
    private String description;
    private String mode;
    private List<String> dates;
    private Integer startHour;
    private Integer endHour;
    private Integer responseCount;
    private String status;
    private String createdAt;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }
}
