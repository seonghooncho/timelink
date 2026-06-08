package com.planner.domain.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
        OAuthProperties.Provider kakao = new OAuthProperties.Provider();
        kakao.setClientId("kakao-client-id");
        oauthProperties.setKakao(kakao);
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
    @DisplayName("Kakao OAuth 시작 URL은 프로필 이름 동의를 요청한다")
    void buildAuthorizationUri_requestsKakaoProfileScope() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/auth/oauth/kakao/start");
        request.setScheme("https");
        request.setServerName("api.example.com");
        request.setServerPort(443);

        URI authorizationUri = socialAuthService.buildAuthorizationUri(
                "kakao",
                "https://timelink.example.com",
                "/",
                request
        );

        assertThat(authorizationUri.toString()).startsWith("https://kauth.kakao.com/oauth/authorize?");
        assertThat(authorizationUri.getRawQuery()).contains("scope=profile_nickname,profile_image");
    }

    @Test
    @DisplayName("Kakao 이름은 계정 이름을 우선 사용한다")
    void resolveKakaoNickname_prefersAccountName() throws Exception {
        JsonNode userInfo = OBJECT_MAPPER.readTree("""
                {
                  "id": 123,
                  "properties": {
                    "nickname": "카카오유저"
                  },
                  "kakao_account": {
                    "name": "홍길동",
                    "profile": {
                      "nickname": "카카오유저",
                      "is_default_nickname": true
                    }
                  }
                }
                """);

        String nickname = SocialAuthService.resolveKakaoNickname(userInfo);

        assertThat(nickname).isEqualTo("홍길동");
    }

    @Test
    @DisplayName("Kakao 기본 닉네임은 실제 이름으로 저장하지 않는다")
    void resolveKakaoNickname_ignoresDefaultNickname() throws Exception {
        JsonNode userInfo = OBJECT_MAPPER.readTree("""
                {
                  "id": 123,
                  "properties": {
                    "nickname": "카카오유저"
                  },
                  "kakao_account": {
                    "email": "real-user@example.com",
                    "profile": {
                      "nickname": "카카오유저",
                      "is_default_nickname": true
                    }
                  }
                }
                """);

        String nickname = SocialAuthService.resolveKakaoNickname(userInfo);

        assertThat(nickname).isEqualTo("real-user");
    }

    @Test
    @DisplayName("Google 이름은 userinfo name을 우선 사용한다")
    void resolveGoogleNickname_prefersName() throws Exception {
        JsonNode userInfo = OBJECT_MAPPER.readTree("""
                {
                  "sub": "google-user-id",
                  "name": "Jane Doe",
                  "email": "jane@example.com"
                }
                """);

        String nickname = SocialAuthService.resolveGoogleNickname(userInfo);

        assertThat(nickname).isEqualTo("Jane Doe");
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
