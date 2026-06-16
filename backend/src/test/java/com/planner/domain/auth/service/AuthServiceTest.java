package com.planner.domain.auth.service;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.analytics.service.AnalyticsService;
import com.planner.domain.auth.repository.RefreshTokenRepository;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.config.AuthProperties;
import com.planner.global.config.JwtProperties;
import com.planner.global.error.CustomException;
import com.planner.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private ProfileService profileService;

    @Mock
    private AuthProperties authProperties;

    @Mock
    private JwtProperties jwtProperties;

    @Mock
    private AnalyticsService analyticsService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("login은 userId를 정규화하고 JWT를 발급한다")
    void login_issuesTokenWithNormalizedUserId() {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId(" Cho_User ");
        req.setNickname("초");

        given(authProperties.isDevLoginEnabled()).willReturn(true);
        given(jwtTokenProvider.generateAccessToken("cho_user")).willReturn("jwt-token");
        given(jwtTokenProvider.generateRefreshToken(eq("cho_user"), any())).willReturn("refresh-token");
        given(jwtProperties.getRefreshExpirationMillis()).willReturn(1_209_600_000L);

        AuthSessionResDTO result = authService.login(req);

        assertThat(result.getUserId()).isEqualTo("cho_user");
        assertThat(result.getAccessToken()).isEqualTo("jwt-token");
        assertThat(result.getRefreshToken()).isEqualTo("refresh-token");
        then(profileService).should().getOrCreate("cho_user", "초", null);
        then(analyticsService).should().recordSystemEvent(eq("cho_user"), eq("login_completed"), any());
    }

    @Test
    @DisplayName("login은 개발 로그인 허용 설정이 꺼져 있으면 토큰을 발급하지 않는다")
    void login_rejectsWhenDevLoginDisabled() {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId("user_1");

        given(authProperties.isDevLoginEnabled()).willReturn(false);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(CustomException.class)
                .hasMessage("개발 로그인은 현재 사용할 수 없습니다");
        verifyNoInteractions(profileService, jwtTokenProvider);
    }

    @Test
    @DisplayName("getSession은 프로필을 보장하고 새 JWT를 발급한다")
    void getSession_returnsNewToken() {
        given(jwtTokenProvider.generateAccessToken("user-1")).willReturn("new-token");
        given(jwtTokenProvider.generateRefreshToken(eq("user-1"), any())).willReturn("refresh-token");
        given(jwtProperties.getRefreshExpirationMillis()).willReturn(1_209_600_000L);

        AuthSessionResDTO result = authService.getSession("user-1");

        assertThat(result.getUserId()).isEqualTo("user-1");
        assertThat(result.getAccessToken()).isEqualTo("new-token");
        assertThat(result.getRefreshToken()).isEqualTo("refresh-token");
        then(profileService).should().getOrCreate("user-1");
    }

    @Test
    @DisplayName("loginSocial은 프로필 힌트를 반영하고 JWT를 발급한다")
    void loginSocial_issuesTokenWithProfileHints() {
        given(jwtTokenProvider.generateAccessToken("google_123")).willReturn("social-token");
        given(jwtTokenProvider.generateRefreshToken(eq("google_123"), any())).willReturn("refresh-token");
        given(jwtProperties.getRefreshExpirationMillis()).willReturn(1_209_600_000L);

        AuthSessionResDTO result = authService.loginSocial("google_123", "홍길동", "https://example.com/avatar.png");

        assertThat(result.getUserId()).isEqualTo("google_123");
        assertThat(result.getAccessToken()).isEqualTo("social-token");
        assertThat(result.getRefreshToken()).isEqualTo("refresh-token");
        then(profileService).should().getOrCreate("google_123", "홍길동", "https://example.com/avatar.png");
    }

    @Test
    @DisplayName("refresh는 저장된 refresh token 해시가 맞을 때 토큰을 회전한다")
    void refresh_rotatesRefreshToken() throws Exception {
        given(jwtTokenProvider.validateRefreshToken("old-refresh")).willReturn(true);
        given(jwtTokenProvider.getUserIdFromRefreshToken("old-refresh")).willReturn("user-1");
        given(jwtTokenProvider.getRefreshTokenId("old-refresh")).willReturn("old-token-id");
        given(refreshTokenRepository.findByUserIdAndTokenId("user-1", "old-token-id"))
                .willReturn(Optional.of(new RefreshTokenRepository.StoredRefreshToken(
                        "old-token-id",
                        sha256("old-refresh"),
                        "2026-06-30T00:00:00Z",
                        Instant.now().plusSeconds(60).getEpochSecond()
                )));
        given(jwtTokenProvider.generateAccessToken("user-1")).willReturn("new-access");
        given(jwtTokenProvider.generateRefreshToken(eq("user-1"), any())).willReturn("new-refresh");
        given(jwtProperties.getRefreshExpirationMillis()).willReturn(1_209_600_000L);

        AuthSessionResDTO result = authService.refresh("old-refresh");

        assertThat(result.getAccessToken()).isEqualTo("new-access");
        assertThat(result.getRefreshToken()).isEqualTo("new-refresh");
        then(refreshTokenRepository).should().deleteByUserIdAndTokenId("user-1", "old-token-id");
    }

    @Test
    @DisplayName("refresh는 저장된 refresh token TTL이 지났으면 삭제하고 거부한다")
    void refresh_rejectsExpiredStoredToken() throws Exception {
        given(jwtTokenProvider.validateRefreshToken("old-refresh")).willReturn(true);
        given(jwtTokenProvider.getUserIdFromRefreshToken("old-refresh")).willReturn("user-1");
        given(jwtTokenProvider.getRefreshTokenId("old-refresh")).willReturn("old-token-id");
        given(refreshTokenRepository.findByUserIdAndTokenId("user-1", "old-token-id"))
                .willReturn(Optional.of(new RefreshTokenRepository.StoredRefreshToken(
                        "old-token-id",
                        sha256("old-refresh"),
                        "2026-06-01T00:00:00Z",
                        Instant.now().minusSeconds(60).getEpochSecond()
                )));

        assertThatThrownBy(() -> authService.refresh("old-refresh"))
                .isInstanceOf(CustomException.class);
        then(refreshTokenRepository).should().deleteByUserIdAndTokenId("user-1", "old-token-id");
    }

    private String sha256(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
