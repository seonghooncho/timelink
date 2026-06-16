package com.planner.domain.analytics.service;

import com.planner.global.error.CustomException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AnalyticsEventSanitizerTest {

    private final AnalyticsEventSanitizer sanitizer = new AnalyticsEventSanitizer();

    @Test
    @DisplayName("허용 이벤트와 property만 남기고 민감정보는 제거한다")
    void sanitize_removesSensitiveProperties() {
        AnalyticsSanitizedEvent event = sanitizer.sanitize("link_opened", Map.of(
                "route", "/invite/ABC123?redirect=/groups/group-1",
                "feature", "groups",
                "link_type", "group_invite",
                "email", "user@example.com",
                "userId", "raw-user",
                "url", "https://timelink.cloud/invite/ABC123"
        ));

        assertThat(event.eventName()).isEqualTo("link_opened");
        assertThat(event.properties())
                .containsEntry("route", "/invite/:inviteCode")
                .containsEntry("feature", "groups")
                .containsEntry("link_type", "group_invite")
                .doesNotContainKeys("email", "userId", "url");
    }

    @Test
    @DisplayName("허용되지 않은 이벤트명은 거부한다")
    void sanitize_rejectsUnknownEvent() {
        assertThatThrownBy(() -> sanitizer.sanitize("schedule_created", Map.of()))
                .isInstanceOf(CustomException.class)
                .hasMessage("허용되지 않은 analytics event입니다");
    }
}
