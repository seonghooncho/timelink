package com.planner.domain.schedule.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScheduleResDTO {
    private String id;
    private String title;
    private String content;
    private String category;
    private Boolean isImportant;
    private String startTime;
    private String endTime;
    private Double duration;
    private Boolean isCompleted;
    private Boolean hasAlarm;
    private String groupId;
    private String createdAt;
    private String updatedAt;
}
