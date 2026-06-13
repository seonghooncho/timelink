package com.planner.domain.schedule.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ScheduleUpdateReqDTO {
    @Size(max = 40)
    private String title;
    @Size(max = 1000)
    private String content;
    private String category;
    private Boolean isImportant;
    private String startTime;
    private Double duration;
    private Boolean isCompleted;
    private Boolean hasAlarm;
    private String imageUrl;
    private String imageId;
}
