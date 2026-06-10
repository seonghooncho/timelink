package com.planner.domain.profile.controller;

import com.planner.domain.profile.dto.ProfileResDTO;
import com.planner.domain.profile.dto.ProfileUpdateReqDTO;
import com.planner.domain.profile.service.ProfileService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/planner/v1/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService service;

    @GetMapping("/me")
    public ResponseEntity<CustomResponse<ProfileResDTO>> getMyProfile() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getOrCreate(userId)));
    }

    @PatchMapping("/me")
    public ResponseEntity<CustomResponse<ProfileResDTO>> updateMyProfile(
            @RequestBody ProfileUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.update(userId, req)));
    }

    @PostMapping("/me/consents/required")
    public ResponseEntity<CustomResponse<ProfileResDTO>> agreeRequiredConsents() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.agreeRequiredConsents(userId)));
    }
}
