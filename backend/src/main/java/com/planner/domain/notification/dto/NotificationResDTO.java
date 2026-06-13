package com.planner.domain.notification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResDTO {
    private String id;
    private String type;
    private String title;
    private String content;
    private String category;
    private String targetType;
    private String targetId;
    private String targetUrl;
    private Boolean isImportant;
    private Boolean isRead;
    private String createdAt;
}
