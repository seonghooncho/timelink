package com.planner.domain.notification.dto;

import lombok.Data;

@Data
public class NotificationSettingsUpdateReqDTO {
    private Boolean scheduleAlarm;
    /** 하위 호환용 필드이며 신규 클라이언트는 pushAlarm만 수정한다. */
    private Boolean groupAlarm;
    private Boolean pushAlarm;
    private Boolean remindOneDayBefore;
    private String remindOneDayBeforeTime;
    private Boolean remindSameDay;
    private String remindSameDayTime;
    private Boolean importantAlarm;
    private String importantAlarmTime;
}
