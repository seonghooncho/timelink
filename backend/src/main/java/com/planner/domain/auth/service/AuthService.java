package com.planner.domain.auth.service;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.config.AuthProperties;
import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import com.planner.global.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtTokenProvider jwtTokenProvider;
    private final ProfileService profileService;
    private final AuthProperties authProperties;

    public AuthSessionResDTO login(AuthLoginReqDTO req) {
        if (!authProperties.isDevLoginEnabled()) {
            throw new CustomException(GeneralErrorCode.FORBIDDEN, "개발 로그인은 현재 사용할 수 없습니다");
        }

        String userId = req.getUserId().trim().toLowerCase();
        return loginSocial(userId, req.getNickname(), null);
    }

    public AuthSessionResDTO getSession(String userId) {
        profileService.getOrCreate(userId);
        return buildSession(userId);
    }

    public AuthSessionResDTO loginSocial(String userId, String nicknameHint, String avatarUrlHint) {
        profileService.getOrCreate(userId, nicknameHint, avatarUrlHint);
        return buildSession(userId);
    }

    private AuthSessionResDTO buildSession(String userId) {
        return AuthSessionResDTO.builder()
                .accessToken(jwtTokenProvider.generateToken(userId))
                .userId(userId)
                .build();
    }
}
