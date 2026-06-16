package com.planner.domain.analytics.service;

import com.planner.global.config.AnalyticsProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserKeyHasherTest {

    @Test
    @DisplayName("raw userId는 안정적인 HMAC user_key로 변환한다")
    void hashUserId_returnsHmac() {
        AnalyticsProperties properties = new AnalyticsProperties();
        properties.setHmacSecret("test-secret");
        UserKeyHasher hasher = new UserKeyHasher(properties);

        String first = hasher.hashUserId("user-1");
        String second = hasher.hashUserId("user-1");

        assertThat(first).isEqualTo(second);
        assertThat(first).doesNotContain("user-1");
        assertThat(first).hasSize(64);
    }
}
