package com.planner.domain.notification.controller;

import com.planner.domain.notification.dto.req.NotificationSettingsUpdateReqDTO;
import com.planner.domain.notification.dto.res.NotificationSettingsResDTO;
import com.planner.domain.notification.service.NotificationService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/planner/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final NotificationService service;

    @GetMapping("/notifications")
    public ResponseEntity<CustomResponse<NotificationSettingsResDTO>> getSettings() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getSettings(userId)));
    }

    @PatchMapping("/notifications")
    public ResponseEntity<CustomResponse<NotificationSettingsResDTO>> updateSettings(
            @RequestBody NotificationSettingsUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updateSettings(userId, req)));
    }
}
