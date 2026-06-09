package com.planner.domain.notification.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PushSubscriptionReqDTO {
    @NotBlank
    private String endpoint;

    @Valid
    @NotNull
    private Keys keys;

    private String userAgent;

    @Data
    public static class Keys {
        @NotBlank
        private String p256dh;

        @NotBlank
        private String auth;
    }
}
