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
@RequestMapping("/api/planner/v1/community/posts")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService service;

    @GetMapping
    public ResponseEntity<CustomResponse<List<CommunityPostResDTO>>> getPosts(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = service.resolveLimit(limit);
        CursorPageResult<CommunityPostResDTO> page = service.getPosts(userId, size, cursor);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), service.toPageMeta(page, size)));
    }

    @PostMapping
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> createPost(
            @Valid @RequestBody CommunityPostCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.createPost(userId, req)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> getPost(@PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.getPost(userId, postId)));
    }

    @PatchMapping("/{postId}")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> updatePost(
            @PathVariable String postId,
            @Valid @RequestBody CommunityPostUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updatePost(userId, postId, req)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        service.deletePost(userId, postId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{postId}/like")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> likePost(@PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.likePost(userId, postId)));
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<CustomResponse<CommunityPostResDTO>> unlikePost(@PathVariable String postId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.unlikePost(userId, postId)));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<CustomResponse<List<CommunityCommentResDTO>>> getComments(
            @PathVariable String postId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        String userId = AuthUtil.getCurrentUserId();
        int size = service.resolveLimit(limit);
        CursorPageResult<CommunityCommentResDTO> page = service.getComments(userId, postId, size, cursor);
        return ResponseEntity.ok(CustomResponse.ok(page.getItems(), service.toPageMeta(page, size)));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CustomResponse<CommunityCommentResDTO>> createComment(
            @PathVariable String postId,
            @Valid @RequestBody CommunityCommentCreateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomResponse.ok(service.createComment(userId, postId, req)));
    }

    @PatchMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<CustomResponse<CommunityCommentResDTO>> updateComment(
            @PathVariable String postId,
            @PathVariable String commentId,
            @Valid @RequestBody CommunityCommentUpdateReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(service.updateComment(userId, postId, commentId, req)));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable String postId,
            @PathVariable String commentId) {
        String userId = AuthUtil.getCurrentUserId();
        service.deleteComment(userId, postId, commentId);
        return ResponseEntity.noContent().build();
    }
}
