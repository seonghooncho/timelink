package com.planner.domain.auth.controller;

import com.planner.domain.auth.dto.AuthLoginReqDTO;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.domain.auth.service.AuthService;
import com.planner.domain.auth.service.SocialAuthService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
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
    private final SocialAuthService socialAuthService;

    @PostMapping("/login")
    public ResponseEntity<CustomResponse<AuthSessionResDTO>> login(
            @Valid @RequestBody AuthLoginReqDTO req) {
        return ResponseEntity.ok(CustomResponse.ok(authService.login(req)));
    }

    @GetMapping("/me")
    public ResponseEntity<CustomResponse<AuthSessionResDTO>> me() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(authService.getSession(userId)));
    }

    @GetMapping("/providers")
    public ResponseEntity<CustomResponse<Map<String, Boolean>>> providers() {
        return ResponseEntity.ok(CustomResponse.ok(socialAuthService.getAvailableProviders()));
    }

    @GetMapping("/oauth/{provider}/start")
    public ResponseEntity<Void> startOAuth(
            @PathVariable String provider,
            @RequestParam String frontendOrigin,
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
        URI location = (error != null)
                ? socialAuthService.buildFailureRedirect(provider, state, error, request)
                : socialAuthService.buildCallbackRedirect(provider, code, state, request);

        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, location.toString())
                .build();
    }
}
