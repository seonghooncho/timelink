package com.planner.domain.analytics.controller;

import com.planner.domain.analytics.dto.AdminMeResDTO;
import com.planner.domain.analytics.dto.AnalyticsSummaryResDTO;
import com.planner.domain.analytics.service.AnalyticsAdminService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planner/v1/admin")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AnalyticsAdminService service;

    @GetMapping("/me")
    public ResponseEntity<CustomResponse<AdminMeResDTO>> me() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getMe(userId)));
    }

    @GetMapping("/analytics/summary")
    public ResponseEntity<CustomResponse<AnalyticsSummaryResDTO>> summary(
            @RequestParam(required = false) String date) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getSummary(userId, date)));
    }
}
