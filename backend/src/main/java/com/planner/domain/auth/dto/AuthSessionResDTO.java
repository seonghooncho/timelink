package com.planner.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthSessionResDTO {
    private String accessToken;
    private String refreshToken;
    private String userId;

    public AuthSessionResDTO withoutRefreshToken() {
        return AuthSessionResDTO.builder()
                .accessToken(accessToken)
                .userId(userId)
                .build();
    }
}
