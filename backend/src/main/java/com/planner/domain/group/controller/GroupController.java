package com.planner.domain.group.controller;

import com.planner.domain.group.dto.req.GroupCreateReqDTO;
import com.planner.domain.group.dto.req.GroupJoinReqDTO;
import com.planner.domain.group.dto.req.GroupUpdateReqDTO;
import com.planner.domain.group.dto.res.GroupDetailResDTO;
import com.planner.domain.group.dto.res.GroupMemberResDTO;
import com.planner.domain.group.dto.res.GroupResDTO;
import com.planner.domain.group.service.GroupService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/planner/v1/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService service;

    @GetMapping
    public ResponseEntity<CustomResponse<List<GroupResDTO>>> getMyGroups() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getMyGroups(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomResponse<GroupDetailResDTO>> getDetail(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getDetail(userId, id)));
    }

    @PostMapping
    public ResponseEntity<CustomResponse<GroupDetailResDTO>> create(
            @Valid @RequestBody GroupCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.create(userId, req)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CustomResponse<GroupDetailResDTO>> update(
            @PathVariable String id, @RequestBody GroupUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.update(userId, id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join")
    public ResponseEntity<CustomResponse<GroupDetailResDTO>> join(
            @Valid @RequestBody GroupJoinReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.join(userId, req.getInviteCode())));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<CustomResponse<List<GroupMemberResDTO>>> getMembers(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getMembers(userId, id)));
    }

    @DeleteMapping("/{id}/members/me")
    public ResponseEntity<Void> leave(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.leave(userId, id);
        return ResponseEntity.noContent().build();
    }
}
