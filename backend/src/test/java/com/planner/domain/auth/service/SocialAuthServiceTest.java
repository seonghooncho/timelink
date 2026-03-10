package com.planner.domain.auth.service;

import com.planner.global.config.CorsProperties;
import com.planner.global.config.JwtProperties;
import com.planner.global.config.OAuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class SocialAuthServiceTest {

    @Mock
    private AuthService authService;

    private SocialAuthService socialAuthService;

    @BeforeEach
    void setUp() {
        OAuthProperties oauthProperties = new OAuthProperties();
        OAuthProperties.Provider google = new OAuthProperties.Provider();
        google.setClientId("google-client-id");
        google.setClientSecret("google-client-secret");
        oauthProperties.setGoogle(google);
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("01234567890123456789012345678901");
        CorsProperties corsProperties = new CorsProperties();
        corsProperties.setAllowedOrigins("https://timelink.example.com, http://localhost:5173");

        socialAuthService = new SocialAuthService(oauthProperties, jwtProperties, corsProperties, authService);
    }

    @Test
    @DisplayName("Google OAuth 시작 URL은 scope와 callback query를 안전하게 인코딩한다")
    void buildAuthorizationUri_encodesGoogleScopeAndCallback() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/auth/oauth/google/start");
        request.setScheme("https");
        request.setServerName("api.example.com");
        request.setServerPort(443);

        URI authorizationUri = socialAuthService.buildAuthorizationUri(
                "google",
                "https://timelink.example.com",
                "/groups",
                request
        );

        assertThat(authorizationUri.toString()).startsWith("https://accounts.google.com/o/oauth2/v2/auth?");
        assertThat(authorizationUri.getRawQuery()).containsPattern("scope=openid(%20|\\+)profile(%20|\\+)email");
        assertThat(authorizationUri.getRawQuery())
                .contains("redirect_uri=https%3A%2F%2Fapi.example.com%2Fapi%2Fplanner%2Fv1%2Fauth%2Foauth%2Fgoogle%2Fcallback");
        assertThat(authorizationUri.getRawQuery()).doesNotContain(" ");
    }

    @Test
    @DisplayName("OAuth 실패 콜백은 state가 없어도 첫 허용 origin 로그인 화면으로 복귀한다")
    void buildFailureRedirect_fallsBackToAllowedOriginWhenStateMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/auth/oauth/google/callback");
        request.setScheme("https");
        request.setServerName("api.example.com");
        request.setServerPort(443);

        URI redirect = socialAuthService.buildFailureRedirect("google", null, "access_denied", request);

        assertThat(redirect.toString()).startsWith("https://timelink.example.com/login");
        assertThat(redirect.getQuery()).contains("error=google");
        assertThat(redirect.getQuery()).contains("message=access_denied");
    }
}
