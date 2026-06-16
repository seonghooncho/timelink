package com.planner.domain.auth.controller;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthRefreshReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.auth.service.AuthService;
import com.planner.domain.auth.service.AuthCookieService;
import com.planner.domain.auth.service.SocialAuthService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Cookie;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/planner/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final SocialAuthService socialAuthService;

    @PostMapping("/login")
    public ResponseEntity<CustomResponse<AuthSessionResDTO>> login(
            @Valid @RequestBody AuthLoginReqDTO req,
            HttpServletRequest request) {
        return sessionResponse(authService.login(req), request);
    }

    @GetMapping("/me")
    public ResponseEntity<CustomResponse<AuthSessionResDTO>> me(HttpServletRequest request) {
        String userId = AuthUtil.getCurrentUserId();
        return sessionResponse(authService.getSession(userId), request);
    }

    @PostMapping("/refresh")
    public ResponseEntity<CustomResponse<AuthSessionResDTO>> refresh(
            @RequestBody(required = false) AuthRefreshReqDTO req,
            HttpServletRequest request) {
        return sessionResponse(authService.refresh(resolveRefreshToken(req, request)), request);
    }

    @PostMapping("/logout")
    public ResponseEntity<CustomResponse<Void>> logout(
            @RequestBody(required = false) AuthRefreshReqDTO req,
            HttpServletRequest request) {
        authService.logout(resolveRefreshToken(req, request));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .body(CustomResponse.ok(null));
    }

    @GetMapping("/providers")
    public ResponseEntity<CustomResponse<Map<String, Boolean>>> providers() {
        return ResponseEntity.ok(CustomResponse.ok(socialAuthService.getAvailableProviders()));
    }

    @GetMapping("/oauth/{provider}/start")
    public ResponseEntity<Void> startOAuth(
            @PathVariable String provider,
            @RequestParam(required = false) String frontendOrigin,
            @RequestParam(required = false, defaultValue = "/") String redirect,
            HttpServletRequest request) {
        URI location = socialAuthService.buildAuthorizationUri(provider, frontendOrigin, redirect, request);
        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, location.toString())
                .build();
    }

    @GetMapping("/oauth/{provider}/callback")
    public ResponseEntity<Void> oauthCallback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletRequest request) {
        SocialAuthService.OAuthRedirectResult result = (error != null)
                ? socialAuthService.buildFailureRedirect(provider, state, error, request)
                : socialAuthService.buildCallbackRedirect(provider, code, state, request);

        ResponseEntity.BodyBuilder response = ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, result.location().toString());
        if (StringUtils.hasText(result.refreshToken())) {
            response.header(HttpHeaders.SET_COOKIE, authCookieService.refreshCookie(result.refreshToken()).toString());
        }
        return response.build();
    }

    private ResponseEntity<CustomResponse<AuthSessionResDTO>> sessionResponse(AuthSessionResDTO session, HttpServletRequest request) {
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (StringUtils.hasText(session.getRefreshToken())) {
            response.header(HttpHeaders.SET_COOKIE, authCookieService.refreshCookie(session.getRefreshToken()).toString());
        }
        return response.body(CustomResponse.ok(shouldExposeRefreshToken(request) ? session : session.withoutRefreshToken()));
    }

    private boolean shouldExposeRefreshToken(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        return "mobile".equalsIgnoreCase(request.getHeader("X-Timelink-Client"));
    }

    private String resolveRefreshToken(AuthRefreshReqDTO req, HttpServletRequest request) {
        if (req != null && StringUtils.hasText(req.getRefreshToken())) {
            return req.getRefreshToken();
        }

        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (authCookieService.refreshCookieName().equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
