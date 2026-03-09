package com.planner.domain.notification.controller;

import com.planner.domain.notification.dto.NotificationResDTO;
import com.planner.domain.notification.service.NotificationService;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/planner/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private static final int DEFAULT_LIMIT = 20;
    private final NotificationService service;

    @GetMapping
    public ResponseEntity<CustomResponse<List<NotificationResDTO>>> getAll(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;

        CursorPageResult<NotificationResDTO> page = service.getAllPaged(userId, type, isRead, size, cursor);
        CustomResponse.PageMeta meta = service.toPageMeta(page, size);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), meta));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<CustomResponse<Void>> markRead(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.markRead(userId, id);
        return ResponseEntity.ok(CustomResponse.ok(null));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<CustomResponse<Map<String, Integer>>> markAllRead() {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.markAllRead(userId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
