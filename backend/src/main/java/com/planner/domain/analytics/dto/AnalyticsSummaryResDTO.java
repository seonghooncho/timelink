package com.planner.domain.analytics.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AnalyticsSummaryResDTO {
    private String date;
    private long totalUsers;
    private long todaySignups;
    private long todayActiveUsers;
    private long activeUsers7d;
    private long activeUsers30d;
    private long todayLinksCreated;
    private long todayLinksOpened;
    private double averageActivitySeconds;
    private List<FeatureUsageDTO> topFeatures;
    private List<ApiPerformanceDTO> apiPerformance;
    private List<RecentErrorDTO> recentErrors;

    @Data
    @Builder
    public static class FeatureUsageDTO {
        private String feature;
        private long count;
    }

    @Data
    @Builder
    public static class ApiPerformanceDTO {
        private String method;
        private String route;
        private long count;
        private long averageMs;
        private long p50Ms;
        private long p95Ms;
        private long clientErrorCount;
        private long serverErrorCount;
    }

    @Data
    @Builder
    public static class RecentErrorDTO {
        private String eventId;
        private String timestamp;
        private String feature;
        private String route;
        private String errorCode;
        private String severity;
    }
}
