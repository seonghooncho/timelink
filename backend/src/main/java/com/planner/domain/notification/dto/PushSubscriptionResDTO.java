package com.planner.domain.notification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PushSubscriptionResDTO {
    private Boolean enabled;
    private String publicKey;
}
