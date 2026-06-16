package com.planner.domain.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.auth.service.AuthCookieService;
import com.planner.domain.auth.service.AuthService;
import com.planner.domain.auth.service.SocialAuthService;
import com.planner.global.config.CorsProperties;
import com.planner.global.config.JwtProperties;
import com.planner.global.config.SecurityConfig;
import com.planner.global.error.GlobalExceptionHandler;
import com.planner.global.security.JwtAuthenticationFilter;
import com.planner.global.security.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseCookie;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({GlobalExceptionHandler.class, SecurityConfig.class})
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AuthService authService;
    @MockBean private AuthCookieService authCookieService;
    @MockBean private SocialAuthService socialAuthService;
    @MockBean private CorsProperties corsProperties;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/auth";

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2, FilterChain.class);
            chain.doFilter(
                    invocation.getArgument(0, ServletRequest.class),
                    invocation.getArgument(1, ServletResponse.class)
            );
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @DisplayName("POST /auth/login 은 인증 없이 토큰을 발급한다")
    void login_returns200() throws Exception {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId("user_1");
        req.setNickname("유저");

        when(authService.login(any())).thenReturn(AuthSessionResDTO.builder()
                .accessToken("jwt-token")
                .refreshToken("refresh-token")
                .userId("user_1")
                .build());
        when(authCookieService.refreshCookie("refresh-token"))
                .thenReturn(ResponseCookie.from("timelink_rt", "refresh-token").path("/api/planner/v1/auth").build());

        mockMvc.perform(post(BASE + "/login").with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.data.userId").value("user_1"));
    }

    @Test
    @DisplayName("POST /auth/login 은 모바일 client에만 refreshToken body를 노출한다")
    void login_mobileReturnsRefreshTokenInBody() throws Exception {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId("user_1");

        when(authService.login(any())).thenReturn(AuthSessionResDTO.builder()
                .accessToken("jwt-token")
                .refreshToken("refresh-token")
                .userId("user_1")
                .build());
        when(authCookieService.refreshCookie("refresh-token"))
                .thenReturn(ResponseCookie.from("timelink_rt", "refresh-token").path("/api/planner/v1/auth").build());

        mockMvc.perform(post(BASE + "/login").with(csrf())
                        .header("X-Timelink-Client", "mobile")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"));
    }

    @Test
    @DisplayName("POST /auth/login 은 잘못된 userId를 거부한다")
    void login_invalidUserId_returns400() throws Exception {
        AuthLoginReqDTO req = new AuthLoginReqDTO();
        req.setUserId("A");

        mockMvc.perform(post(BASE + "/login").with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user-1")
    @DisplayName("GET /auth/me 는 현재 세션을 반환한다")
    void me_returns200() throws Exception {
        when(authService.getSession("user-1")).thenReturn(AuthSessionResDTO.builder()
                .accessToken("fresh-token")
                .refreshToken("fresh-refresh")
                .userId("user-1")
                .build());
        when(authCookieService.refreshCookie("fresh-refresh"))
                .thenReturn(ResponseCookie.from("timelink_rt", "fresh-refresh").path("/api/planner/v1/auth").build());

        mockMvc.perform(get(BASE + "/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.data.userId").value("user-1"));
    }

    @Test
    @DisplayName("GET /auth/providers 는 활성화된 provider 목록을 반환한다")
    void providers_returns200() throws Exception {
        when(socialAuthService.getAvailableProviders()).thenReturn(Map.of("google", true, "kakao", false));

        mockMvc.perform(get(BASE + "/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.google").value(true))
                .andExpect(jsonPath("$.data.kakao").value(false));
    }

    @Test
    @DisplayName("GET /auth/oauth/google/start 는 provider authorize URL로 리다이렉트한다")
    void startOAuth_redirects() throws Exception {
        when(socialAuthService.buildAuthorizationUri(eq("google"), eq("https://frontend.example.com"), eq("/groups"), any()))
                .thenReturn(URI.create("https://accounts.google.com/o/oauth2/v2/auth?state=abc"));

        mockMvc.perform(get(BASE + "/oauth/google/start")
                        .queryParam("frontendOrigin", "https://frontend.example.com")
                        .queryParam("redirect", "/groups"))
                .andExpect(status().isFound())
                .andExpect(jsonPath("$").doesNotExist());
    }

    @Test
    @DisplayName("GET /auth/oauth/google/callback 은 프론트 callback 경로로 리다이렉트한다")
    void oauthCallback_redirects() throws Exception {
        when(socialAuthService.buildCallbackRedirect(eq("google"), eq("oauth-code"), eq("signed-state"), any()))
                .thenReturn(new SocialAuthService.OAuthRedirectResult(
                        URI.create("https://frontend.example.com/auth/callback#accessToken=jwt"),
                        "refresh-token"
                ));
        when(authCookieService.refreshCookie("refresh-token"))
                .thenReturn(ResponseCookie.from("timelink_rt", "refresh-token").path("/api/planner/v1/auth").build());

        mockMvc.perform(get(BASE + "/oauth/google/callback")
                        .queryParam("code", "oauth-code")
                .queryParam("state", "signed-state"))
                .andExpect(status().isFound());
    }

    @Test
    @DisplayName("GET /auth/oauth/google/callback 은 state 없이 실패해도 로그인 화면으로 복귀시킨다")
    void oauthCallback_error_redirectsWithoutState() throws Exception {
        when(socialAuthService.buildFailureRedirect(eq("google"), eq(""), eq("access_denied"), any()))
                .thenReturn(new SocialAuthService.OAuthRedirectResult(
                        URI.create("https://frontend.example.com/login?error=google"),
                        null
                ));

        mockMvc.perform(get(BASE + "/oauth/google/callback")
                        .queryParam("error", "access_denied")
                        .queryParam("state", ""))
                .andExpect(status().isFound());
    }
}
