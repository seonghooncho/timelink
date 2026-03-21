package com.planner.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "oauth")
public class OAuthProperties {

    private String allowedFrontendOrigins;
    private String publicApiBaseUrl;
    private Provider google = new Provider();
    private Provider kakao = new Provider();

    @Getter
    @Setter
    public static class Provider {
        private String clientId;
        private String clientSecret;
    }
}
