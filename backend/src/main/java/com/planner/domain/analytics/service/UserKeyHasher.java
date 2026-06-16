package com.planner.domain.analytics.service;

import com.planner.global.config.AnalyticsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Component
@RequiredArgsConstructor
public class UserKeyHasher {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final AnalyticsProperties properties;

    public String hashUserId(String userId) {
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(properties.getHmacSecret())) {
            return null;
        }

        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(properties.getHmacSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(userId.trim().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("analytics user_key를 생성할 수 없습니다", exception);
        }
    }
}
