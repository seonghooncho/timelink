package com.planner.domain.coordination.dto.res;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CoordinationResDTO {
    private String id;
    private String title;
    private String mode;
    private List<String> dates;
    private Integer startHour;
    private Integer endHour;
    private String status;
    private int responseCount;
    private String createdBy;
    private String createdAt;
}
