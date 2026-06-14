package com.planner.domain.notification.dto;

import lombok.Data;

@Data
public class ScheduledNotificationEvent {
    private String jobId;
    private String userId;
    private String notificationId;
    private String type;
    private String title;
    private String content;
    private String category;
    private Boolean important;
    private String scheduleId;
    private String reminderType;
    private String targetType;
    private String targetId;
    private String targetUrl;
}
