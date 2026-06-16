package com.planner.domain.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnalyticsTrackResDTO {
    private boolean accepted;
    private String eventId;
}
