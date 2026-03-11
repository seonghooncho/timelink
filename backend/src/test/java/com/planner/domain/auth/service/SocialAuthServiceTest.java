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
        oauthProperties.setAllowedFrontendOrigins("timelink://app");
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
    @DisplayName("설정된 public API base URL이 있으면 OAuth callback에 사용한다")
    void buildAuthorizationUri_usesConfiguredPublicApiBaseUrl() {
        OAuthProperties oauthProperties = new OAuthProperties();
        oauthProperties.setAllowedFrontendOrigins("https://timelink.example.com,timelink://app");
        oauthProperties.setPublicApiBaseUrl("https://timelink.cloud");
        OAuthProperties.Provider google = new OAuthProperties.Provider();
        google.setClientId("google-client-id");
        google.setClientSecret("google-client-secret");
        oauthProperties.setGoogle(google);

        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("01234567890123456789012345678901");
        CorsProperties corsProperties = new CorsProperties();
        corsProperties.setAllowedOrigins("https://timelink.example.com");

        SocialAuthService service = new SocialAuthService(oauthProperties, jwtProperties, corsProperties, authService);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/auth/oauth/google/start");
        request.setScheme("https");
        request.setServerName("sotr621lgc.execute-api.ap-northeast-2.amazonaws.com");
        request.setServerPort(443);

        URI authorizationUri = service.buildAuthorizationUri("google", "timelink://app", "/", request);

        assertThat(authorizationUri.getRawQuery())
                .contains("redirect_uri=https%3A%2F%2Ftimelink.cloud%2Fapi%2Fplanner%2Fv1%2Fauth%2Foauth%2Fgoogle%2Fcallback");
    }

    @Test
    @DisplayName("모바일 앱 origin도 OAuth 시작 URL에 사용할 수 있다")
    void buildAuthorizationUri_allowsMobileAppOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/auth/oauth/google/start");
        request.setScheme("https");
        request.setServerName("timelink.cloud");
        request.setServerPort(443);

        URI authorizationUri = socialAuthService.buildAuthorizationUri(
                "google",
                "timelink://app",
                "/",
                request
        );

        assertThat(authorizationUri.toString()).startsWith("https://accounts.google.com/o/oauth2/v2/auth?");
        assertThat(authorizationUri.getRawQuery()).contains("state=");
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

    @Test
    @DisplayName("모바일 OAuth 실패 콜백은 앱 callback 경로로 복귀한다")
    void buildFailureRedirect_returnsAppCallbackForMobileOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/auth/oauth/google/callback");
        request.setScheme("https");
        request.setServerName("timelink.cloud");
        request.setServerPort(443);

        URI startUri = socialAuthService.buildAuthorizationUri(
                "google",
                "timelink://app",
                "/groups",
                request
        );

        String state = extractQueryParam(startUri, "state");
        URI redirect = socialAuthService.buildFailureRedirect("google", state, "access_denied", request);

        assertThat(redirect.toString()).startsWith("timelink://app/auth/callback#");
        assertThat(redirect.toString()).contains("redirect=%2Fgroups");
        assertThat(redirect.toString()).contains("error=google");
        assertThat(redirect.toString()).contains("message=access_denied");
    }

    private String extractQueryParam(URI uri, String key) {
        for (String pair : uri.getRawQuery().split("&")) {
            if (pair.startsWith(key + "=")) {
                return pair.substring((key + "=").length());
            }
        }
        return "";
    }
}
