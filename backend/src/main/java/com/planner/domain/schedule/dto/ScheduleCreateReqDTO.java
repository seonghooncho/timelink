package com.planner.domain.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ScheduleCreateReqDTO {
    @NotBlank @Size(max = 40) private String title;
    @Size(max = 1000) private String content;
    @NotBlank private String category;
    private Boolean isImportant = false;
    @NotBlank private String startTime;
    private Double duration;
    private Boolean hasAlarm = false;
    private String groupId;
    private List<String> participantUserIds;
    private String imageUrl;
    private String imageId;
}
