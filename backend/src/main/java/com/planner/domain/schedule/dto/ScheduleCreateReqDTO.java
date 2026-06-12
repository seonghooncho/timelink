package com.planner.domain.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ScheduleCreateReqDTO {
    @NotBlank private String title;
    private String content;
    @NotBlank private String category;
    private Boolean isImportant = false;
    @NotBlank private String startTime;
    private Double duration;
    private Boolean hasAlarm = false;
    private String groupId;
    private String imageUrl;
    private String imageId;
}
