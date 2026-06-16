package com.planner.domain.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminMeResDTO {
    private boolean admin;
    private String userId;
}
