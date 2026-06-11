package com.planner.domain.coordination.controller;

import com.planner.domain.coordination.dto.req.CoordinationCreateReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationSubmitReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationUpdateReqDTO;
import com.planner.domain.coordination.dto.res.*;
import com.planner.domain.coordination.service.CoordinationService;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/planner/v1/groups/{groupId}/coordinations")
@RequiredArgsConstructor
public class CoordinationController {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private final CoordinationService service;

    @GetMapping
    public ResponseEntity<CustomResponse<List<CoordinationResDTO>>> getAll(
            @PathVariable String groupId,
            @RequestParam(required = false, defaultValue = "active") String status,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = resolveLimit(limit);

        CursorPageResult<CoordinationResDTO> page = service.getByGroupIdPaged(userId, groupId, status, size, cursor);
        CustomResponse.PageMeta meta = service.toPageMeta(page, size);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), meta));
    }

    private int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomResponse<CoordinationDetailResDTO>> getById(
            @PathVariable String groupId, @PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getDetail(userId, groupId, id)));
    }

    @PostMapping
    public ResponseEntity<CustomResponse<CoordinationResDTO>> create(
            @PathVariable String groupId,
            @Valid @RequestBody CoordinationCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.create(userId, groupId, req)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CustomResponse<CoordinationResDTO>> update(
            @PathVariable String groupId, @PathVariable String id,
            @RequestBody CoordinationUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.update(userId, groupId, id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String groupId, @PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.delete(userId, groupId, id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{coordId}/responses/me")
    public ResponseEntity<CustomResponse<SubmitResultDTO>> submitResponses(
            @PathVariable String groupId, @PathVariable String coordId,
            @Valid @RequestBody CoordinationSubmitReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.submitResponses(userId, groupId, coordId, req)));
    }

    @GetMapping("/{coordId}/responses/me")
    public ResponseEntity<CustomResponse<MyResponsesResultDTO>> getMyResponses(
            @PathVariable String groupId, @PathVariable String coordId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getMyResponses(userId, groupId, coordId)));
    }

    @DeleteMapping("/{coordId}/responses/me")
    public ResponseEntity<Void> deleteMyResponses(
            @PathVariable String groupId, @PathVariable String coordId) {
        String userId = AuthUtil.getCurrentUserId();
        service.deleteMyResponses(userId, groupId, coordId);
        return ResponseEntity.noContent().build();
    }
}
