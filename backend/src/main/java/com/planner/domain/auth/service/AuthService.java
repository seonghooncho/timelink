package com.planner.domain.auth.service;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.analytics.service.AnalyticsService;
import com.planner.domain.auth.repository.RefreshTokenRepository;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.config.AuthProperties;
import com.planner.global.config.JwtProperties;
import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import com.planner.global.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtTokenProvider jwtTokenProvider;
    private final ProfileService profileService;
    private final AuthProperties authProperties;
    private final JwtProperties jwtProperties;
    private final AnalyticsService analyticsService;
    private final RefreshTokenRepository refreshTokenRepository;

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
        analyticsService.recordSystemEvent(userId, "login_completed", java.util.Map.of(
                "surface", "server",
                "feature", "auth"
        ));
        return buildSession(userId);
    }

    public AuthSessionResDTO refresh(String refreshToken) {
        if (!StringUtils.hasText(refreshToken) || !jwtTokenProvider.validateRefreshToken(refreshToken)) {
            throw new CustomException(GeneralErrorCode.UNAUTHORIZED);
        }

        String userId = jwtTokenProvider.getUserIdFromRefreshToken(refreshToken);
        String tokenId = jwtTokenProvider.getRefreshTokenId(refreshToken);
        var stored = refreshTokenRepository.findByUserIdAndTokenId(userId, tokenId)
                .orElseThrow(() -> new CustomException(GeneralErrorCode.UNAUTHORIZED));

        if (stored.ttl() > 0 && stored.ttl() <= Instant.now().getEpochSecond()) {
            refreshTokenRepository.deleteByUserIdAndTokenId(userId, tokenId);
            throw new CustomException(GeneralErrorCode.UNAUTHORIZED);
        }

        if (!tokenId.equals(stored.tokenId()) || !hashToken(refreshToken).equals(stored.tokenHash())) {
            refreshTokenRepository.deleteByUserIdAndTokenId(userId, tokenId);
            throw new CustomException(GeneralErrorCode.UNAUTHORIZED);
        }

        AuthSessionResDTO session = buildSession(userId);
        refreshTokenRepository.deleteByUserIdAndTokenId(userId, tokenId);
        return session;
    }

    public void logout(String refreshToken) {
        if (!StringUtils.hasText(refreshToken) || !jwtTokenProvider.validateRefreshToken(refreshToken)) {
            return;
        }

        String userId = jwtTokenProvider.getUserIdFromRefreshToken(refreshToken);
        String tokenId = jwtTokenProvider.getRefreshTokenId(refreshToken);
        refreshTokenRepository.deleteByUserIdAndTokenId(userId, tokenId);
    }

    private AuthSessionResDTO buildSession(String userId) {
        String tokenId = UUID.randomUUID().toString();
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId, tokenId);
        Instant refreshExpiresAt = Instant.now().plusMillis(jwtProperties.getRefreshExpirationMillis());
        refreshTokenRepository.save(
                userId,
                tokenId,
                hashToken(refreshToken),
                refreshExpiresAt.toString(),
                refreshExpiresAt.getEpochSecond(),
                Instant.now().toString()
        );

        return AuthSessionResDTO.builder()
                .accessToken(jwtTokenProvider.generateAccessToken(userId))
                .refreshToken(refreshToken)
                .userId(userId)
                .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new CustomException(GeneralErrorCode.INTERNAL_ERROR, "refresh token hash를 계산할 수 없습니다");
        }
    }
}
