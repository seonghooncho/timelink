package com.planner.domain.auth.service;

import com.planner.global.config.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AuthCookieService {

    private final JwtProperties jwtProperties;

    public ResponseCookie refreshCookie(String refreshToken) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(jwtProperties.getRefreshCookieName(), refreshToken)
                .httpOnly(true)
                .secure(jwtProperties.isRefreshCookieSecure())
                .sameSite(jwtProperties.getRefreshCookieSameSite())
                .path(jwtProperties.getRefreshCookiePath())
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshExpirationMillis()));

        if (StringUtils.hasText(jwtProperties.getRefreshCookieDomain())) {
            builder.domain(jwtProperties.getRefreshCookieDomain().trim());
        }

        return builder.build();
    }

    public ResponseCookie clearRefreshCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(jwtProperties.getRefreshCookieName(), "")
                .httpOnly(true)
                .secure(jwtProperties.isRefreshCookieSecure())
                .sameSite(jwtProperties.getRefreshCookieSameSite())
                .path(jwtProperties.getRefreshCookiePath())
                .maxAge(Duration.ZERO);

        if (StringUtils.hasText(jwtProperties.getRefreshCookieDomain())) {
            builder.domain(jwtProperties.getRefreshCookieDomain().trim());
        }

        return builder.build();
    }

    public String refreshCookieName() {
        return jwtProperties.getRefreshCookieName();
    }
}
