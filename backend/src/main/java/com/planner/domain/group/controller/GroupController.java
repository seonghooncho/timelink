package com.planner.domain.group.controller;

import com.planner.domain.group.dto.GroupCreateReqDTO;
import com.planner.domain.group.dto.GroupDetailResDTO;
import com.planner.domain.group.dto.GroupIntroNoticeDTO;
import com.planner.domain.group.dto.GroupIntroPostDTO;
import com.planner.domain.group.dto.GroupIntroResDTO;
import com.planner.domain.group.dto.GroupIntroUpdateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestCreateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestDecisionReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestResDTO;
import com.planner.domain.group.dto.GroupJoinReqDTO;
import com.planner.domain.group.dto.GroupMemberProfileResDTO;
import com.planner.domain.group.dto.GroupMemberProfileUpdateReqDTO;
import com.planner.domain.group.dto.GroupMemberResDTO;
import com.planner.domain.group.dto.GroupNoticeCreateReqDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupUpdateReqDTO;
import com.planner.domain.group.service.GroupService;
import com.planner.domain.schedule.dto.ScheduleResDTO;
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
@RequestMapping("/api/planner/v1/groups")
@RequiredArgsConstructor
public class GroupController {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private final GroupService service;
    private final ScheduleService scheduleService;

    @GetMapping
    public ResponseEntity<CustomResponse<List<GroupResDTO>>> getMyGroups(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = resolveLimit(limit);
        CursorPageResult<GroupResDTO> page = service.getMyGroupsPaged(userId, size, cursor);
        CustomResponse.PageMeta meta = service.toPageMeta(page, size);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), meta));
    }

    @GetMapping("/public")
    public ResponseEntity<CustomResponse<List<GroupResDTO>>> getPublicGroups(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) String q) {
        String userId = AuthUtil.getCurrentUserId();
        int size = resolveLimit(limit);
        CursorPageResult<GroupResDTO> page = service.getPublicGroupsPaged(userId, size, cursor, q);
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
    public ResponseEntity<CustomResponse<GroupDetailResDTO>> getDetail(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getDetail(userId, id)));
    }

    @GetMapping("/{id}/intro")
    public ResponseEntity<CustomResponse<GroupIntroResDTO>> getIntro(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getIntro(userId, id)));
    }

    @GetMapping("/{id}/intro/posts")
    public ResponseEntity<CustomResponse<List<GroupIntroPostDTO>>> getIntroPosts(
            @PathVariable String id,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = limit != null && limit > 0 ? Math.min(limit, 20) : 3;
        CursorPageResult<GroupIntroPostDTO> page = service.getIntroPosts(userId, id, size, cursor);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), service.toPageMeta(page, size)));
    }

    @PatchMapping("/{id}/intro")
    public ResponseEntity<CustomResponse<GroupIntroResDTO>> updateIntro(
            @PathVariable String id,
            @Valid @RequestBody GroupIntroUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updateIntro(userId, id, req)));
    }

    @PostMapping("/{id}/notices")
    public ResponseEntity<CustomResponse<GroupIntroNoticeDTO>> createNotice(
            @PathVariable String id,
            @Valid @RequestBody GroupNoticeCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.createNotice(userId, id, req)));
    }

    @GetMapping("/{id}/notices")
    public ResponseEntity<CustomResponse<List<GroupIntroNoticeDTO>>> getNotices(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getNotices(userId, id)));
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
            @PathVariable String id, @Valid @RequestBody GroupUpdateReqDTO req) {
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

    @GetMapping("/{id}/schedules")
    public ResponseEntity<CustomResponse<List<ScheduleResDTO>>> getSchedules(
            @PathVariable String id,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer limit) {
        String userId = AuthUtil.getCurrentUserId();
        int size = resolveLimit(limit);
        return ResponseEntity.ok(CustomResponse.ok(scheduleService.getGroupSchedules(userId, id, startDate, endDate, size)));
    }

    @GetMapping("/{id}/members/{memberUserId}/profile")
    public ResponseEntity<CustomResponse<GroupMemberProfileResDTO>> getMemberProfile(
            @PathVariable String id,
            @PathVariable String memberUserId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getMemberProfile(userId, id, memberUserId)));
    }

    @PatchMapping("/{id}/members/me/profile")
    public ResponseEntity<CustomResponse<GroupMemberProfileResDTO>> updateMyMemberProfile(
            @PathVariable String id,
            @Valid @RequestBody GroupMemberProfileUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updateMyMemberProfile(userId, id, req)));
    }

    @PostMapping("/{id}/join-requests")
    public ResponseEntity<CustomResponse<GroupJoinRequestResDTO>> requestToJoin(
            @PathVariable String id,
            @Valid @RequestBody GroupJoinRequestCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.requestToJoin(userId, id, req)));
    }

    @GetMapping("/{id}/join-requests")
    public ResponseEntity<CustomResponse<List<GroupJoinRequestResDTO>>> getJoinRequests(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getJoinRequests(userId, id)));
    }

    @PatchMapping("/{id}/join-requests/{memberUserId}")
    public ResponseEntity<CustomResponse<GroupJoinRequestResDTO>> decideJoinRequest(
            @PathVariable String id,
            @PathVariable String memberUserId,
            @Valid @RequestBody GroupJoinRequestDecisionReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.decideJoinRequest(userId, id, memberUserId, req)));
    }

    @DeleteMapping("/{id}/members/me")
    public ResponseEntity<Void> leave(@PathVariable String id) {
        String userId = AuthUtil.getCurrentUserId();
        service.leave(userId, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/members/{memberUserId}")
    public ResponseEntity<Void> removeMember(@PathVariable String id, @PathVariable String memberUserId) {
        String userId = AuthUtil.getCurrentUserId();
        service.removeMember(userId, id, memberUserId);
        return ResponseEntity.noContent().build();
    }
}
