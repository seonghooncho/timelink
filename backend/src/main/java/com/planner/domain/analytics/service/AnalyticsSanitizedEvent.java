package com.planner.domain.analytics.service;

import java.util.Map;

public record AnalyticsSanitizedEvent(
        String eventName,
        Map<String, Object> properties
) {
}
