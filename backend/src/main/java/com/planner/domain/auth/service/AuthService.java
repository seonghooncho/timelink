package com.planner.domain.auth.service;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtTokenProvider jwtTokenProvider;
    private final ProfileService profileService;

    public AuthSessionResDTO login(AuthLoginReqDTO req) {
        String userId = req.getUserId().trim().toLowerCase();
        profileService.getOrCreate(userId, req.getNickname());
        return buildSession(userId);
    }

    public AuthSessionResDTO getSession(String userId) {
        profileService.getOrCreate(userId);
        return buildSession(userId);
    }

    private AuthSessionResDTO buildSession(String userId) {
        return AuthSessionResDTO.builder()
                .accessToken(jwtTokenProvider.generateToken(userId))
                .userId(userId)
                .build();
    }
}
