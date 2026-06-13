package com.planner.domain.community.service;

import com.planner.domain.community.converter.CommunityConverter;
import com.planner.domain.community.dto.CommunityCommentCreateReqDTO;
import com.planner.domain.community.dto.CommunityCommentResDTO;
import com.planner.domain.community.dto.CommunityCommentUpdateReqDTO;
import com.planner.domain.community.dto.CommunityPostCreateReqDTO;
import com.planner.domain.community.dto.CommunityPostResDTO;
import com.planner.domain.community.dto.CommunityPostUpdateReqDTO;
import com.planner.domain.community.error.CommunityErrorCode;
import com.planner.domain.community.error.CommunityException;
import com.planner.domain.community.model.CommunityComment;
import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.community.repository.CommunityRepository;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private static final int DEFAULT_LIMIT = 20;

    private final CommunityRepository repository;
    private final ProfileRepository profileRepository;
    private final CursorCodec cursorCodec;

    public CursorPageResult<CommunityPostResDTO> getPosts(String userId, Integer limit, String cursorToken) {
        int size = resolveLimit(limit);
        Cursor cursor = cursorToken != null ? cursorCodec.decode(cursorToken) : null;
        CursorPageResult<CommunityPost> page = repository.findPostsPaged(size, cursor);
        List<CommunityPostResDTO> dtos = page.getItems().stream()
                .map(post -> CommunityConverter.toPostResponse(post, userId, repository.isLikedBy(post.getId(), userId)))
                .toList();
        return CursorPageResult.<CommunityPostResDTO>builder()
                .items(dtos)
                .nextCursor(page.getNextCursor())
                .build();
    }

    public CommunityPostResDTO createPost(String userId, CommunityPostCreateReqDTO req) {
        validateText(req.getTitle());
        validateText(req.getContent());
        CommunityPost post = CommunityConverter.toPost(userId, findProfile(userId), req);
        repository.savePost(post);
        return CommunityConverter.toPostResponse(post, userId, false);
    }

    public CommunityPostResDTO getPost(String userId, String postId) {
        CommunityPost post = findPostOrThrow(postId);
        return CommunityConverter.toPostResponse(post, userId, repository.isLikedBy(postId, userId));
    }

    public CommunityPostResDTO updatePost(String userId, String postId, CommunityPostUpdateReqDTO req) {
        CommunityPost post = findPostOrThrow(postId);
        requireAuthor(userId, post.getAuthorUserId());

        if (req.getTitle() != null) {
            validateText(req.getTitle());
            post.setTitle(req.getTitle().trim());
        }
        if (req.getContent() != null) {
            validateText(req.getContent());
            post.setContent(req.getContent().trim());
        }
        post.setUpdatedAt(Instant.now().toString());
        repository.savePost(post);
        return CommunityConverter.toPostResponse(post, userId, repository.isLikedBy(postId, userId));
    }

    public void deletePost(String userId, String postId) {
        CommunityPost post = findPostOrThrow(postId);
        requireAuthor(userId, post.getAuthorUserId());
        repository.deletePostCascade(postId);
    }

    public CommunityPostResDTO likePost(String userId, String postId) {
        findPostOrThrow(postId);
        repository.likePost(postId, userId);
        return getPost(userId, postId);
    }

    public CommunityPostResDTO unlikePost(String userId, String postId) {
        findPostOrThrow(postId);
        repository.unlikePost(postId, userId);
        return getPost(userId, postId);
    }

    public CursorPageResult<CommunityCommentResDTO> getComments(String userId, String postId, Integer limit, String cursorToken) {
        findPostOrThrow(postId);
        int size = resolveLimit(limit);
        Cursor cursor = cursorToken != null ? cursorCodec.decode(cursorToken) : null;
        CursorPageResult<CommunityComment> page = repository.findCommentsByPostIdPaged(postId, size, cursor);
        List<CommunityCommentResDTO> dtos = page.getItems().stream()
                .map(comment -> CommunityConverter.toCommentResponse(comment, userId))
                .toList();
        return CursorPageResult.<CommunityCommentResDTO>builder()
                .items(dtos)
                .nextCursor(page.getNextCursor())
                .build();
    }

    public CommunityCommentResDTO createComment(String userId, String postId, CommunityCommentCreateReqDTO req) {
        findPostOrThrow(postId);
        validateText(req.getContent());
        CommunityComment comment = CommunityConverter.toComment(postId, userId, findProfile(userId), req.getContent());
        repository.saveComment(comment);
        repository.incrementCommentCount(postId);
        return CommunityConverter.toCommentResponse(comment, userId);
    }

    public CommunityCommentResDTO updateComment(String userId, String postId, String commentId, CommunityCommentUpdateReqDTO req) {
        CommunityComment comment = findCommentOrThrow(postId, commentId);
        requireAuthor(userId, comment.getAuthorUserId());
        validateText(req.getContent());
        comment.setContent(req.getContent().trim());
        comment.setUpdatedAt(Instant.now().toString());
        repository.saveComment(comment);
        return CommunityConverter.toCommentResponse(comment, userId);
    }

    public void deleteComment(String userId, String postId, String commentId) {
        CommunityComment comment = findCommentOrThrow(postId, commentId);
        requireAuthor(userId, comment.getAuthorUserId());
        if (repository.deleteComment(comment)) {
            repository.decrementCommentCount(postId);
        }
    }

    public CustomResponse.PageMeta toPageMeta(CursorPageResult<?> page, int perPage) {
        return CustomResponse.PageMeta.builder()
                .perPage(perPage)
                .nextCursor(page.getNextCursor() != null ? cursorCodec.encode(page.getNextCursor()) : null)
                .build();
    }

    public int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, 100);
    }

    private Profile findProfile(String userId) {
        return profileRepository.findByUserId(userId).orElse(null);
    }

    private CommunityPost findPostOrThrow(String postId) {
        return repository.findPost(postId)
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
    }

    private CommunityComment findCommentOrThrow(String postId, String commentId) {
        return repository.findComment(postId, commentId)
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
    }

    private void requireAuthor(String userId, String authorUserId) {
        if (!userId.equals(authorUserId)) {
            throw new CommunityException(CommunityErrorCode.NOT_AUTHOR);
        }
    }

    private void validateText(String value) {
        if (!StringUtils.hasText(value)) {
            throw new CommunityException(CommunityErrorCode.EMPTY_CONTENT);
        }
    }
}
