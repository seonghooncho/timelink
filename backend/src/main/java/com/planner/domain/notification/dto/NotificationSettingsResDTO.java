package com.planner.domain.notification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationSettingsResDTO {
    private Boolean scheduleAlarm;
    private Boolean groupAlarm;
    private Boolean pushAlarm;
    private Boolean remindOneDayBefore;
    private String remindOneDayBeforeTime;
    private Boolean remindSameDay;
    private String remindSameDayTime;
    private Boolean importantAlarm;
    private String importantAlarmTime;
}
