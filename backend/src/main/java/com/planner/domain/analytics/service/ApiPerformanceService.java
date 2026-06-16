package com.planner.domain.analytics.service;

import com.planner.domain.analytics.repository.AnalyticsRepository;
import com.planner.global.config.AnalyticsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiPerformanceService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final AnalyticsProperties properties;
    private final AnalyticsRepository repository;

    public void record(String method, String route, int status, long durationMs) {
        if (!properties.isEnabled() || !properties.isApiMetricsEnabled()) {
            return;
        }
        if (!StringUtils.hasText(method) || !StringUtils.hasText(route)) {
            return;
        }

        Instant now = Instant.now();
        String date = now.atZone(SERVICE_ZONE).toLocalDate().toString();
        try {
            repository.recordApiLatency(
                    date,
                    method.trim().toUpperCase(Locale.ROOT),
                    route.trim(),
                    status,
                    durationMs,
                    now
            );
        } catch (Exception exception) {
            log.warn("api_latency_metric_failed method={} route={} status={}", method, route, status, exception);
        }
    }
}
