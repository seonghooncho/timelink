package com.planner.domain.analytics.service;

import com.planner.domain.analytics.dto.AnalyticsTrackReqDTO;
import com.planner.domain.analytics.dto.AnalyticsTrackResDTO;
import com.planner.domain.analytics.repository.AnalyticsRepository;
import com.planner.global.config.AnalyticsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter HOUR_FORMATTER = DateTimeFormatter.ofPattern("HH").withZone(SERVICE_ZONE);

    private final AnalyticsProperties properties;
    private final AnalyticsEventSanitizer sanitizer;
    private final UserKeyHasher userKeyHasher;
    private final AnalyticsRepository repository;

    public AnalyticsTrackResDTO track(String userId, AnalyticsTrackReqDTO req) {
        AnalyticsSanitizedEvent event = sanitizer.sanitize(req.getEventName(), req.getProperties());
        return persist(userId, event);
    }

    public void recordSystemEvent(String userId, String eventName, Map<String, Object> eventProperties) {
        if (!properties.isEnabled()) {
            return;
        }

        try {
            AnalyticsSanitizedEvent event = sanitizer.sanitize(eventName, eventProperties);
            persist(userId, event);
        } catch (Exception exception) {
            log.warn("analytics_system_event_failed eventName={}", eventName, exception);
        }
    }

    public void recordSignupCompleted(String userId) {
        if (!properties.isEnabled()) {
            return;
        }

        Instant now = Instant.now();
        try {
            repository.incrementTotalUsers(now);
            recordSystemEvent(userId, "signup_completed", Map.of(
                    "surface", "server",
                    "feature", "auth",
                    "source", "profile"
            ));
        } catch (Exception exception) {
            log.warn("analytics_signup_counter_failed", exception);
        }
    }

    private AnalyticsTrackResDTO persist(String userId, AnalyticsSanitizedEvent event) {
        if (!properties.isEnabled()) {
            return AnalyticsTrackResDTO.builder().accepted(false).build();
        }

        Instant now = Instant.now();
        String eventId = UUID.randomUUID().toString();
        String date = now.atZone(SERVICE_ZONE).toLocalDate().toString();
        String hour = HOUR_FORMATTER.format(now);
        String userKey = userKeyHasher.hashUserId(userId);
        Map<String, Object> eventProperties = event.properties();

        try {
            repository.incrementDailyEvent(date, event.eventName(), now);
            repository.incrementDailyFeature(date, featureFor(event), now);
            repository.markActiveUser(date, userKey, now);
            if ("error_shown".equals(event.eventName())) {
                repository.saveRecentError(eventId, now.toString(), eventProperties);
            }
            repository.putRawEvent(rawEvent(eventId, event, now, date, userKey), date, hour, eventId);
        } catch (Exception exception) {
            log.warn("analytics_persist_failed eventName={} eventId={}", event.eventName(), eventId, exception);
        }

        return AnalyticsTrackResDTO.builder()
                .accepted(true)
                .eventId(eventId)
                .build();
    }

    private String featureFor(AnalyticsSanitizedEvent event) {
        Object feature = event.properties().get("feature");
        if (feature instanceof String s && StringUtils.hasText(s)) {
            return s;
        }
        return switch (event.eventName()) {
            case "signup_completed", "login_completed" -> "auth";
            case "link_created", "link_opened", "link_copied", "link_shared", "link_deleted" -> "sharing";
            case "settings_updated" -> "settings";
            case "error_shown" -> "error";
            default -> "navigation";
        };
    }

    private Map<String, Object> rawEvent(
            String eventId,
            AnalyticsSanitizedEvent event,
            Instant timestamp,
            String date,
            String userKey
    ) {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("event_id", eventId);
        raw.put("event_name", event.eventName());
        raw.put("timestamp", timestamp.toString());
        raw.put("date", date);
        raw.put("anonymous", !StringUtils.hasText(userKey));
        if (StringUtils.hasText(userKey)) {
            raw.put("user_key", userKey);
        }
        raw.put("properties", event.properties());
        return raw;
    }
}
