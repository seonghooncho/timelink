package com.planner.domain.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class AnalyticsTrackReqDTO {

    @NotBlank
    private String eventName;

    private Map<String, Object> properties;
}
