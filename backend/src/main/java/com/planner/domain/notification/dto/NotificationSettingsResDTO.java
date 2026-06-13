package com.planner.domain.notification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationSettingsResDTO {
    private Boolean scheduleAlarm;
    /** 하위 호환용 필드이며 사용자 푸시 여부는 pushAlarm을 기준으로 한다. */
    private Boolean groupAlarm;
    private Boolean pushAlarm;
    private Boolean remindOneDayBefore;
    private String remindOneDayBeforeTime;
    private Boolean remindSameDay;
    private String remindSameDayTime;
    private Boolean importantAlarm;
    private String importantAlarmTime;
}
