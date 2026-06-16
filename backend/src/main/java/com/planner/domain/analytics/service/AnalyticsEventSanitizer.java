package com.planner.domain.analytics.service;

import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class AnalyticsEventSanitizer {

    private static final int MAX_PROPERTIES = 12;
    private static final int MAX_TEXT_LENGTH = 120;
    private static final Pattern SAFE_TOKEN = Pattern.compile("^[a-z0-9_.:-]{1,64}$");
    private static final Set<String> ALLOWED_EVENTS = Set.of(
            "page_view",
            "signup_completed",
            "login_completed",
            "link_created",
            "link_opened",
            "link_copied",
            "link_shared",
            "link_deleted",
            "settings_updated",
            "error_shown"
    );
    private static final Set<String> ALLOWED_STRING_PROPERTIES = Set.of(
            "surface",
            "platform",
            "route",
            "feature",
            "source",
            "result",
            "page_type",
            "link_type",
            "settings_type",
            "error_code",
            "severity"
    );
    private static final Set<String> ALLOWED_NUMBER_PROPERTIES = Set.of(
            "duration_ms",
            "activity_seconds"
    );
    private static final Set<String> SENSITIVE_PROPERTY_NAMES = Set.of(
            "email",
            "name",
            "phone",
            "access_token",
            "accessToken",
            "refresh_token",
            "refreshToken",
            "token",
            "authorization",
            "userId",
            "user_id",
            "userKey",
            "url",
            "href",
            "link",
            "inviteCode",
            "invite_code",
            "title",
            "content",
            "description",
            "memo",
            "body",
            "text",
            "message"
    );

    public AnalyticsSanitizedEvent sanitize(String eventName, Map<String, Object> properties) {
        String normalizedEventName = normalizeEventName(eventName);
        if (!ALLOWED_EVENTS.contains(normalizedEventName)) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "허용되지 않은 analytics event입니다");
        }

        Map<String, Object> sanitized = new LinkedHashMap<>();
        if (properties == null || properties.isEmpty()) {
            return new AnalyticsSanitizedEvent(normalizedEventName, sanitized);
        }

        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            if (sanitized.size() >= MAX_PROPERTIES) {
                break;
            }

            String key = entry.getKey();
            if (key == null || SENSITIVE_PROPERTY_NAMES.contains(key)) {
                continue;
            }

            if (ALLOWED_STRING_PROPERTIES.contains(key)) {
                sanitizeStringProperty(key, entry.getValue(), sanitized);
            } else if (ALLOWED_NUMBER_PROPERTIES.contains(key)) {
                sanitizeNumberProperty(key, entry.getValue(), sanitized);
            }
        }

        return new AnalyticsSanitizedEvent(normalizedEventName, sanitized);
    }

    private String normalizeEventName(String eventName) {
        if (eventName == null) {
            return "";
        }
        return eventName.trim().toLowerCase(Locale.ROOT);
    }

    private void sanitizeStringProperty(String key, Object rawValue, Map<String, Object> target) {
        if (!(rawValue instanceof String value)) {
            return;
        }

        String normalized = "route".equals(key)
                ? toRouteTemplate(value)
                : value.trim().toLowerCase(Locale.ROOT);

        if (normalized.isBlank() || normalized.length() > MAX_TEXT_LENGTH) {
            return;
        }

        if ("route".equals(key)) {
            if (normalized.startsWith("/") && normalized.length() <= MAX_TEXT_LENGTH) {
                target.put(key, normalized);
            }
            return;
        }

        if (SAFE_TOKEN.matcher(normalized).matches()) {
            target.put(key, normalized);
        }
    }

    private void sanitizeNumberProperty(String key, Object rawValue, Map<String, Object> target) {
        Number number = switch (rawValue) {
            case Number n -> n;
            case String s -> {
                try {
                    yield Double.parseDouble(s);
                } catch (NumberFormatException ignored) {
                    yield null;
                }
            }
            default -> null;
        };

        if (number == null) {
            return;
        }

        double value = number.doubleValue();
        if (!Double.isFinite(value) || value < 0) {
            return;
        }

        double max = "duration_ms".equals(key) ? 86_400_000d : 86_400d;
        target.put(key, Math.min(value, max));
    }

    private String toRouteTemplate(String value) {
        String route = value.trim().split("[?#]", 2)[0];
        if (route.isBlank() || !route.startsWith("/") || route.startsWith("//")) {
            return "";
        }
        if (route.length() > MAX_TEXT_LENGTH) {
            return "";
        }

        if (route.matches("^/groups/[^/]+/coordination/[^/]+/timetable$")) {
            return "/groups/:id/coordination/:coordId/timetable";
        }
        if (route.matches("^/groups/[^/]+/coordination$")) {
            return "/groups/:id/coordination";
        }
        if (route.matches("^/groups/[^/]+/posts/[^/]+$")) {
            return "/groups/:id/posts/:postId";
        }
        if (route.matches("^/groups/[^/]+/intro$")) {
            return "/groups/:id/intro";
        }
        if (route.matches("^/groups/join/[^/]+$")) {
            return "/groups/join/:inviteCode";
        }
        if (route.matches("^/groups/[^/]+$")) {
            return "/groups/:id";
        }
        if (route.matches("^/community/posts/[^/]+$")) {
            return "/community/posts/:postId";
        }
        if (route.matches("^/invite/[^/]+$")) {
            return "/invite/:inviteCode";
        }

        return route.matches("^/[a-z0-9/_:-]*$") ? route : "";
    }
}
