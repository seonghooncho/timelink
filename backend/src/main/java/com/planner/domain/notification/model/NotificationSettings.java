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
public class NotificationSettings {

    private String pk;
    private String sk;
    private Boolean scheduleAlarm;
    private Boolean groupAlarm;
    private Boolean pushAlarm;
    private Boolean remindOneDayBefore;
    private String remindOneDayBeforeTime;
    private Boolean remindSameDay;
    private String remindSameDayTime;
    private Boolean importantAlarm;
    private String importantAlarmTime;
    private String updatedAt;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() { return pk; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }
}
