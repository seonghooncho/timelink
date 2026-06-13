package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupScheduleSummaryDTO {
    private String id;
    private String title;
    private String startTime;
    private Double duration;
}
