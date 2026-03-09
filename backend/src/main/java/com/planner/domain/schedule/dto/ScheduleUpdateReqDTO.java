package com.planner.domain.schedule.dto;

import lombok.Data;

@Data
public class ScheduleUpdateReqDTO {
    private String title;
    private String content;
    private String category;
    private Boolean isImportant;
    private String startTime;
    private String endTime;
    private Double duration;
    private Boolean isCompleted;
    private Boolean hasAlarm;
}
