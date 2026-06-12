package com.planner.domain.notification.converter;

import com.planner.domain.notification.dto.NotificationResDTO;
import com.planner.domain.notification.dto.NotificationSettingsResDTO;
import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.NotificationSettings;

public final class NotificationConverter {

    private NotificationConverter() {}

    public static NotificationResDTO toResponse(Notification n) {
        return NotificationResDTO.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .content(n.getContent())
                .category(n.getCategory())
                .isImportant(n.getIsImportant())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }

    public static NotificationSettingsResDTO toSettingsResponse(NotificationSettings s) {
        return NotificationSettingsResDTO.builder()
                .scheduleAlarm(s.getScheduleAlarm())
                .groupAlarm(s.getGroupAlarm())
                .pushAlarm(resolvePushAlarm(s))
                .remindOneDayBefore(s.getRemindOneDayBefore())
                .remindOneDayBeforeTime(s.getRemindOneDayBeforeTime())
                .remindSameDay(s.getRemindSameDay())
                .remindSameDayTime(s.getRemindSameDayTime())
                .importantAlarm(s.getImportantAlarm())
                .importantAlarmTime(s.getImportantAlarmTime())
                .build();
    }

    private static Boolean resolvePushAlarm(NotificationSettings s) {
        return s.getPushAlarm() != null ? s.getPushAlarm() : Boolean.TRUE.equals(s.getGroupAlarm());
    }
}
