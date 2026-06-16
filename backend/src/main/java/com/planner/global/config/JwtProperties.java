package com.planner.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String secret;
    private long expiration;
    private long accessExpiration;
    private long refreshExpiration = 1_209_600_000L;
    private String refreshSecret;
    private String refreshCookieName = "timelink_rt";
    private String refreshCookiePath = "/api/planner/v1/auth";
    private String refreshCookieDomain;
    private String refreshCookieSameSite = "Lax";
    private boolean refreshCookieSecure = false;

    public long getAccessExpirationMillis() {
        return accessExpiration > 0 ? accessExpiration : expiration;
    }

    public long getRefreshExpirationMillis() {
        return refreshExpiration > 0 ? refreshExpiration : 1_209_600_000L;
    }

    public String getResolvedRefreshSecret() {
        return refreshSecret != null && !refreshSecret.isBlank() ? refreshSecret : secret;
    }
}
