package com.planner.domain.auth.service;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private ProfileService profileService;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("login은 userId를 정규화하고 JWT를 발급한다")
    void login_issuesTokenWithNormalizedUserId() {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId(" Cho_User ");
        req.setNickname("초");

        given(jwtTokenProvider.generateToken("cho_user")).willReturn("jwt-token");

        AuthSessionResDTO result = authService.login(req);

        assertThat(result.getUserId()).isEqualTo("cho_user");
        assertThat(result.getAccessToken()).isEqualTo("jwt-token");
        then(profileService).should().getOrCreate("cho_user", "초");
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
}
