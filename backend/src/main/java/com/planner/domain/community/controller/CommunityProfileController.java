package com.planner.domain.community.controller;

import com.planner.domain.community.dto.CommunityPublicProfileDTO;
import com.planner.domain.community.service.CommunityService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planner/v1/community/profiles")
@RequiredArgsConstructor
public class CommunityProfileController {

    private final CommunityService service;

    @GetMapping("/{userId}")
    public ResponseEntity<CustomResponse<CommunityPublicProfileDTO>> getPublicProfile(@PathVariable String userId) {
        String viewerUserId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getPublicProfile(viewerUserId, userId)));
    }
}
