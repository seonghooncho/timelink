package com.planner.domain.auth.service;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.config.AuthProperties;
import com.planner.global.error.CustomException;
import com.planner.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("login은 userId를 정규화하고 JWT를 발급한다")
    void login_issuesTokenWithNormalizedUserId() {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId(" Cho_User ");
        req.setNickname("초");

        given(authProperties.isDevLoginEnabled()).willReturn(true);
        given(jwtTokenProvider.generateToken("cho_user")).willReturn("jwt-token");

        AuthSessionResDTO result = authService.login(req);

        assertThat(result.getUserId()).isEqualTo("cho_user");
        assertThat(result.getAccessToken()).isEqualTo("jwt-token");
        then(profileService).should().getOrCreate("cho_user", "초", null);
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
        given(jwtTokenProvider.generateToken("user-1")).willReturn("new-token");

        AuthSessionResDTO result = authService.getSession("user-1");

        assertThat(result.getUserId()).isEqualTo("user-1");
        assertThat(result.getAccessToken()).isEqualTo("new-token");
        then(profileService).should().getOrCreate("user-1");
    }

    @Test
    @DisplayName("loginSocial은 프로필 힌트를 반영하고 JWT를 발급한다")
    void loginSocial_issuesTokenWithProfileHints() {
        given(jwtTokenProvider.generateToken("google_123")).willReturn("social-token");

        AuthSessionResDTO result = authService.loginSocial("google_123", "홍길동", "https://example.com/avatar.png");

        assertThat(result.getUserId()).isEqualTo("google_123");
        assertThat(result.getAccessToken()).isEqualTo("social-token");
        then(profileService).should().getOrCreate("google_123", "홍길동", "https://example.com/avatar.png");
    }
}
