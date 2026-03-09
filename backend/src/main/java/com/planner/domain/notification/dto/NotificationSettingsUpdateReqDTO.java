package com.planner.domain.notification.dto;

import lombok.Data;

@Data
public class NotificationSettingsUpdateReqDTO {
    private Boolean scheduleAlarm;
    private Boolean groupAlarm;
    private Boolean remindOneDayBefore;
    private String remindOneDayBeforeTime;
    private Boolean remindSameDay;
    private String remindSameDayTime;
    private Boolean importantAlarm;
    private String importantAlarmTime;
}
