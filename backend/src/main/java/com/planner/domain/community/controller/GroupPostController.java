package com.planner.domain.community.controller;

import com.planner.domain.community.dto.CommunityCommentCreateReqDTO;
import com.planner.domain.community.dto.CommunityCommentResDTO;
import com.planner.domain.community.dto.CommunityCommentUpdateReqDTO;
import com.planner.domain.community.dto.CommunityPostCreateReqDTO;
import com.planner.domain.community.dto.CommunityPostResDTO;
import com.planner.domain.community.dto.CommunityPostUpdateReqDTO;
import com.planner.domain.community.service.CommunityService;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/planner/v1/groups/{groupId}/posts")
@RequiredArgsConstructor
public class GroupPostController {

    private final CommunityService service;

    @GetMapping
    public ResponseEntity<CustomResponse<List<CommunityPostResDTO>>> getPosts(
            @PathVariable String groupId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = service.resolveLimit(limit);
        CursorPageResult<CommunityPostResDTO> page = service.getGroupPosts(userId, groupId, size, cursor);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), service.toPageMeta(page, size)));
    }

    @PostMapping
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> createPost(
            @PathVariable String groupId,
            @Valid @RequestBody CommunityPostCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.createGroupPost(userId, groupId, req)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> getPost(
            @PathVariable String groupId,
            @PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getGroupPost(userId, groupId, postId)));
    }

    @PatchMapping("/{postId}")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> updatePost(
            @PathVariable String groupId,
            @PathVariable String postId,
            @Valid @RequestBody CommunityPostUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updateGroupPost(userId, groupId, postId, req)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable String groupId,
            @PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        service.deleteGroupPost(userId, groupId, postId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{postId}/like")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> likePost(
            @PathVariable String groupId,
            @PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.likeGroupPost(userId, groupId, postId)));
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> unlikePost(
            @PathVariable String groupId,
            @PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.unlikeGroupPost(userId, groupId, postId)));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<CustomResponse<List<CommunityCommentResDTO>>> getComments(
            @PathVariable String groupId,
            @PathVariable String postId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = service.resolveLimit(limit);
        CursorPageResult<CommunityCommentResDTO> page = service.getGroupComments(userId, groupId, postId, size, cursor);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), service.toPageMeta(page, size)));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CustomResponse<CommunityCommentResDTO>> createComment(
            @PathVariable String groupId,
            @PathVariable String postId,
            @Valid @RequestBody CommunityCommentCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.createGroupComment(userId, groupId, postId, req)));
    }

    @PatchMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<CustomResponse<CommunityCommentResDTO>> updateComment(
            @PathVariable String groupId,
            @PathVariable String postId,
            @PathVariable String commentId,
            @Valid @RequestBody CommunityCommentUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updateGroupComment(userId, groupId, postId, commentId, req)));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable String groupId,
            @PathVariable String postId,
            @PathVariable String commentId) {
        String userId = AuthUtil.getCurrentUserId();
        service.deleteGroupComment(userId, groupId, postId, commentId);
        return ResponseEntity.noContent().build();
    }
}
