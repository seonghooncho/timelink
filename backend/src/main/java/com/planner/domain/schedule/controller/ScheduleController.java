package com.planner.domain.schedule.controller;

import com.planner.domain.schedule.dto.ScheduleCreateReqDTO;
import com.planner.domain.schedule.dto.ScheduleResDTO;
import com.planner.domain.schedule.dto.ScheduleUpdateReqDTO;
import com.planner.domain.schedule.service.ScheduleService;
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
@RequestMapping("/api/planner/v1/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private final ScheduleService service;

    @GetMapping
    public ResponseEntity<CustomResponse<List<ScheduleResDTO>>> getAll(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = resolveLimit(limit);

        CursorPageResult<ScheduleResDTO> page;
        if (startDate != null && endDate != null) {
            page = service.getByTimeRangePaged(userId, startDate, endDate, size, cursor);
        } else {
            page = service.getAllPaged(userId, size, cursor);
        }

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
    public ResponseEntity<CustomResponse<ScheduleResDTO>> getById(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getById(userId, id)));
    }

    @PostMapping
    public ResponseEntity<CustomResponse<ScheduleResDTO>> create(
            @Valid @RequestBody ScheduleCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.create(userId, req)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CustomResponse<ScheduleResDTO>> update(
            @PathVariable String id, @Valid @RequestBody ScheduleUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.update(userId, id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/participation")
    public ResponseEntity<Void> leaveParticipation(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.leaveGroupSchedule(userId, id);
        return ResponseEntity.noContent().build();
    }
}
