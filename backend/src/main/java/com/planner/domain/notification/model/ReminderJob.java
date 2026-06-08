package com.planner.domain.notification.model;

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
public class ReminderJob {

    private String pk;
    private String sk;
    private String id;
    private String userId;
    private String scheduleId;
    private String reminderType;
    private String schedulerName;
    private String scheduledAt;
    private String notificationId;
    private String title;
    private String content;
    private String category;
    private Boolean isImportant;
    private String createdAt;
    private String updatedAt;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }
}
