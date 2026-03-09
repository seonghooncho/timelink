package com.planner.domain.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthSessionResDTO {
    private String accessToken;
    private String userId;
}
