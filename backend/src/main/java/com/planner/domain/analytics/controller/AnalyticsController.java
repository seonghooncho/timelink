package com.planner.domain.analytics.controller;

import com.planner.domain.analytics.dto.AnalyticsTrackReqDTO;
import com.planner.domain.analytics.dto.AnalyticsTrackResDTO;
import com.planner.domain.analytics.service.AnalyticsService;
import com.planner.global.response.CustomResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planner/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService service;

    @PostMapping("/track")
    public ResponseEntity<CustomResponse<AnalyticsTrackResDTO>> track(
            @Valid @RequestBody AnalyticsTrackReqDTO req) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(CustomResponse.ok(service.track(currentUserIdOrNull(), req)));
    }

    private String currentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return authentication.getName();
    }
}
