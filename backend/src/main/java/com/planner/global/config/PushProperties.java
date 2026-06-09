package com.planner.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "push")
public class PushProperties {

    private Vapid vapid = new Vapid();
    private String subject;

    @Getter
    @Setter
    public static class Vapid {
        private String publicKey;
        private String privateKey;
    }
}
