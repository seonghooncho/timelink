package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GroupCoordinationSummaryDTO {
    private String id;
    private String title;
    private String description;
    private String mode;
    private List<String> dates;
    private Integer startHour;
    private Integer endHour;
    private String status;
    private Integer responseCount;
    private String createdAt;
}
