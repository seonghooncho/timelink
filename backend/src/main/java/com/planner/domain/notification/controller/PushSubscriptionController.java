package com.planner.domain.notification.controller;

import com.planner.domain.notification.dto.PushSubscriptionReqDTO;
import com.planner.domain.notification.dto.PushSubscriptionResDTO;
import com.planner.domain.notification.service.PushSubscriptionService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/planner/v1/push")
@RequiredArgsConstructor
public class PushSubscriptionController {

    private final PushSubscriptionService service;

    @GetMapping("/vapid-public-key")
    public ResponseEntity<CustomResponse<PushSubscriptionResDTO>> getPublicKey() {
        return ResponseEntity.ok(CustomResponse.ok(service.getPublicKey()));
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<CustomResponse<PushSubscriptionResDTO>> save(
            @Valid @RequestBody PushSubscriptionReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.save(userId, req)));
    }

    @DeleteMapping("/subscriptions")
    public ResponseEntity<Void> delete(@Valid @RequestBody PushSubscriptionReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        service.delete(userId, req);
        return ResponseEntity.noContent().build();
    }
}
