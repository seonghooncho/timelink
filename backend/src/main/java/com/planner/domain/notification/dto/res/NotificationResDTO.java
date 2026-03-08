package com.planner.domain.notification.dto.res;

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
    private Boolean isImportant;
    private Boolean isRead;
    private String createdAt;
}
