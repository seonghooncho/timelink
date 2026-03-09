package com.planner.domain.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScheduleCreateReqDTO {
    @NotBlank private String title;
    private String content;
    @NotBlank private String category;
    private Boolean isImportant = false;
    @NotNull private String startTime;
    @NotNull private String endTime;
    private Double duration;
    private Boolean hasAlarm = true;
    private String groupId;
}
