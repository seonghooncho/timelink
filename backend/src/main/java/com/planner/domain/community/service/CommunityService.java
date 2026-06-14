package com.planner.domain.community.service;

import com.planner.domain.community.converter.CommunityConverter;
import com.planner.domain.community.dto.CommunityActivityDTO;
import com.planner.domain.community.dto.CommunityCommentCreateReqDTO;
import com.planner.domain.community.dto.CommunityCommentResDTO;
import com.planner.domain.community.dto.CommunityCommentUpdateReqDTO;
import com.planner.domain.community.dto.CommunityPostCreateReqDTO;
import com.planner.domain.community.dto.CommunityPostResDTO;
import com.planner.domain.community.dto.CommunityPostUpdateReqDTO;
import com.planner.domain.community.dto.CommunityPublicGroupDTO;
import com.planner.domain.community.dto.CommunityPublicProfileDTO;
import com.planner.domain.community.error.CommunityErrorCode;
import com.planner.domain.community.error.CommunityException;
import com.planner.domain.community.model.CommunityComment;
import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.community.repository.CommunityRepository;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupJoinRequest;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.error.GroupErrorCode;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.domain.storage.model.ImagePurpose;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.model.ImageUpload;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private static final int DEFAULT_LIMIT = 20;
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final int PUBLIC_PROFILE_GROUP_LIMIT = 5;
    private static final int PUBLIC_PROFILE_ACTIVITY_SCAN_LIMIT = 50;
    private static final int PUBLIC_PROFILE_ACTIVITY_LIMIT = 5;

    private final CommunityRepository repository;
    private final ProfileRepository profileRepository;
    private final GroupRepository groupRepository;
    private final CursorCodec cursorCodec;
    private final StorageService storageService;

    public CursorPageResult<CommunityPostResDTO> getPosts(String userId, Integer limit, String cursorToken) {
        int size = resolveLimit(limit);
        Cursor cursor = cursorToken != null ? cursorCodec.decode(cursorToken) : null;
        CursorPageResult<CommunityPost> page = repository.findPostsPaged(size, cursor);
        List<CommunityPostResDTO> dtos = page.getItems().stream()
                .map(post -> toPostResponse(userId, post))
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

    public CommunityPublicProfileDTO getPublicProfile(String viewerUserId, String targetUserId) {
        if (!StringUtils.hasText(targetUserId)) {
            throw new CommunityException(CommunityErrorCode.POST_NOT_FOUND);
        }

        Profile profile = profileRepository.findByUserId(targetUserId).orElse(null);
        return CommunityPublicProfileDTO.builder()
                .userId(targetUserId)
                .nickname(resolveNickname(profile))
                .avatarUrl(resolveAvatarUrl(profile))
                .thumbnailUrl(resolveThumbnailUrl(profile))
                .publicGroups(findPublicGroupsForProfile(viewerUserId, targetUserId))
                .recentActivities(findRecentPublicActivities(targetUserId))
                .build();
    }

    public CursorPageResult<CommunityPostResDTO> getGroupPosts(String userId, String groupId, Integer limit, String cursorToken) {
        requireGroupMember(groupId, userId);
        int size = resolveLimit(limit);
        Cursor cursor = cursorToken != null ? cursorCodec.decode(cursorToken) : null;
        CursorPageResult<CommunityPost> page = repository.findGroupPostsPaged(groupId, size, cursor);
        List<CommunityPostResDTO> dtos = page.getItems().stream()
                .map(post -> toPostResponse(userId, post))
                .toList();
        return CursorPageResult.<CommunityPostResDTO>builder()
                .items(dtos)
                .nextCursor(page.getNextCursor())
                .build();
    }

    public CommunityPostResDTO createGroupPost(String userId, String groupId, CommunityPostCreateReqDTO req) {
        requireGroupMember(groupId, userId);
        validateText(req.getTitle());
        validateText(req.getContent());
        CommunityPost post = CommunityConverter.toGroupPost(groupId, userId, findProfile(userId), req);
        repository.savePost(post);
        return CommunityConverter.toPostResponse(post, userId, false);
    }

    public CommunityPostResDTO getPost(String userId, String postId) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        return toPostResponse(userId, post);
    }

    public CommunityPostResDTO getGroupPost(String userId, String groupId, String postId) {
        CommunityPost post = findGroupPostOrThrow(userId, groupId, postId);
        return toPostResponse(userId, post);
    }

    public CommunityPostResDTO updatePost(String userId, String postId, CommunityPostUpdateReqDTO req) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        requireAuthor(userId, post.getAuthorUserId());
        return updatePostFields(userId, post, req);
    }

    public CommunityPostResDTO updateGroupPost(String userId, String groupId, String postId, CommunityPostUpdateReqDTO req) {
        CommunityPost post = findGroupPostOrThrow(userId, groupId, postId);
        requireAuthor(userId, post.getAuthorUserId());
        return updatePostFields(userId, post, req);
    }

    public void deletePost(String userId, String postId) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        requireAuthor(userId, post.getAuthorUserId());
        repository.deletePostCascade(postId);
    }

    public void deleteGroupPost(String userId, String groupId, String postId) {
        CommunityPost post = findGroupPostOrThrow(userId, groupId, postId);
        requireAuthor(userId, post.getAuthorUserId());
        repository.deletePostCascade(postId);
    }

    public CommunityPostResDTO likePost(String userId, String postId) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        repository.likePost(postId, userId);
        return getPost(userId, postId);
    }

    public CommunityPostResDTO unlikePost(String userId, String postId) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        repository.unlikePost(postId, userId);
        return getPost(userId, postId);
    }

    public CommunityPostResDTO likeGroupPost(String userId, String groupId, String postId) {
        findGroupPostOrThrow(userId, groupId, postId);
        repository.likePost(postId, userId);
        return getGroupPost(userId, groupId, postId);
    }

    public CommunityPostResDTO unlikeGroupPost(String userId, String groupId, String postId) {
        findGroupPostOrThrow(userId, groupId, postId);
        repository.unlikePost(postId, userId);
        return getGroupPost(userId, groupId, postId);
    }

    public CursorPageResult<CommunityCommentResDTO> getComments(String userId, String postId, Integer limit, String cursorToken) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        return getVisibleComments(userId, postId, limit, cursorToken);
    }

    public CursorPageResult<CommunityCommentResDTO> getGroupComments(
            String userId,
            String groupId,
            String postId,
            Integer limit,
            String cursorToken) {
        findGroupPostOrThrow(userId, groupId, postId);
        return getVisibleComments(userId, postId, limit, cursorToken);
    }

    private CursorPageResult<CommunityCommentResDTO> getVisibleComments(
            String userId,
            String postId,
            Integer limit,
            String cursorToken) {
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
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        return createVisibleComment(userId, postId, req);
    }

    public CommunityCommentResDTO createGroupComment(String userId, String groupId, String postId, CommunityCommentCreateReqDTO req) {
        findGroupPostOrThrow(userId, groupId, postId);
        return createVisibleComment(userId, postId, req);
    }

    private CommunityCommentResDTO createVisibleComment(String userId, String postId, CommunityCommentCreateReqDTO req) {
        validateText(req.getContent());
        CommunityComment comment = CommunityConverter.toComment(postId, userId, findProfile(userId), req.getContent());
        repository.saveComment(comment);
        repository.incrementCommentCount(postId);
        return CommunityConverter.toCommentResponse(comment, userId);
    }

    public CommunityCommentResDTO updateComment(String userId, String postId, String commentId, CommunityCommentUpdateReqDTO req) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        return updateVisibleComment(userId, postId, commentId, req);
    }

    public CommunityCommentResDTO updateGroupComment(
            String userId,
            String groupId,
            String postId,
            String commentId,
            CommunityCommentUpdateReqDTO req) {
        findGroupPostOrThrow(userId, groupId, postId);
        return updateVisibleComment(userId, postId, commentId, req);
    }

    private CommunityCommentResDTO updateVisibleComment(String userId, String postId, String commentId, CommunityCommentUpdateReqDTO req) {
        CommunityComment comment = findCommentOrThrow(postId, commentId);
        requireAuthor(userId, comment.getAuthorUserId());
        validateText(req.getContent());
        comment.setContent(req.getContent().trim());
        comment.setUpdatedAt(Instant.now().toString());
        repository.saveComment(comment);
        return CommunityConverter.toCommentResponse(comment, userId);
    }

    public void deleteComment(String userId, String postId, String commentId) {
        CommunityPost post = findPostOrThrow(postId);
        requirePostVisible(post, userId);
        deleteVisibleComment(userId, postId, commentId);
    }

    public void deleteGroupComment(String userId, String groupId, String postId, String commentId) {
        findGroupPostOrThrow(userId, groupId, postId);
        deleteVisibleComment(userId, postId, commentId);
    }

    private void deleteVisibleComment(String userId, String postId, String commentId) {
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

    private CommunityPost findGroupPostOrThrow(String userId, String groupId, String postId) {
        requireGroupMember(groupId, userId);
        CommunityPost post = findPostOrThrow(postId);
        if (!groupId.equals(post.getGroupId())) {
            throw new CommunityException(CommunityErrorCode.POST_NOT_FOUND);
        }
        return post;
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

    private CommunityPostResDTO updatePostFields(String userId, CommunityPost post, CommunityPostUpdateReqDTO req) {
        if (req.getTitle() != null) {
            validateText(req.getTitle());
            post.setTitle(req.getTitle().trim());
        }
        if (req.getContent() != null) {
            validateText(req.getContent());
            post.setContent(req.getContent().trim());
        }
        applyPostImage(userId, post, req.getImageId());
        post.setUpdatedAt(Instant.now().toString());
        repository.savePost(post);
        return toPostResponse(userId, post);
    }

    private CommunityPostResDTO toPostResponse(String userId, CommunityPost post) {
        CommunityPostResDTO dto = CommunityConverter.toPostResponse(post, userId, repository.isLikedBy(post.getId(), userId));
        if (post.getCommentCount() != null && post.getCommentCount() > 0) {
            repository.findLatestCommentByPostId(post.getId())
                    .map(comment -> CommunityConverter.toCommentResponse(comment, userId))
                    .ifPresent(dto::setPreviewComment);
        }
        return dto;
    }

    private void applyPostImage(String userId, CommunityPost post, String imageId) {
        if (imageId == null) {
            return;
        }
        if (!StringUtils.hasText(imageId)) {
            post.setImageId(null);
            post.setImageStatus(null);
            post.setImageUploadKey(null);
            post.setImageObjectKey(null);
            post.setImageUrl(null);
            return;
        }
        ImagePurpose purpose = StringUtils.hasText(post.getGroupId())
                ? ImagePurpose.GROUP_POST
                : ImagePurpose.COMMUNITY_POST;
        ImageUpload upload = storageService.attachImageToTarget(userId, imageId, purpose, post.getId());
        post.setImageId(upload.getImageId());
        post.setImageStatus(upload.getStatus());
        post.setImageUploadKey(upload.getUploadKey());
        post.setImageObjectKey(upload.getPublicKey());
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getPublicUrl())) {
            post.setImageUrl(upload.getPublicUrl());
        }
    }

    private void requirePostVisible(CommunityPost post, String userId) {
        if (StringUtils.hasText(post.getGroupId())) {
            requireGroupMember(post.getGroupId(), userId);
        }
    }

    private void requireGroupMember(String groupId, String userId) {
        groupRepository.findGroupById(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));
        groupRepository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
    }

    private List<CommunityPublicGroupDTO> findPublicGroupsForProfile(String viewerUserId, String targetUserId) {
        List<GroupMember> memberships = groupRepository.findGroupsByUserId(targetUserId);
        Map<String, Group> groupsById = groupRepository.findGroupsByIds(
                memberships.stream()
                        .map(this::resolveGroupIdFromMembership)
                        .filter(StringUtils::hasText)
                        .toList()
        );

        return memberships.stream()
                .map(this::resolveGroupIdFromMembership)
                .map(groupsById::get)
                .filter(Objects::nonNull)
                .filter(group -> VISIBILITY_PUBLIC.equals(resolveVisibility(group)))
                .limit(PUBLIC_PROFILE_GROUP_LIMIT)
                .map(group -> toPublicGroupProfileSummary(viewerUserId, group))
                .toList();
    }

    private String resolveGroupIdFromMembership(GroupMember membership) {
        if (membership == null) {
            return null;
        }
        if (StringUtils.hasText(membership.getGroupId())) {
            return membership.getGroupId();
        }
        String gsi2sk = membership.getGsi2sk();
        if (StringUtils.hasText(gsi2sk) && gsi2sk.startsWith("GROUP#")) {
            return gsi2sk.substring("GROUP#".length());
        }
        return null;
    }

    private CommunityPublicGroupDTO toPublicGroupProfileSummary(String viewerUserId, Group group) {
        GroupMember membership = groupRepository.findMember(group.getId(), viewerUserId).orElse(null);
        GroupJoinRequest joinRequest = membership == null
                ? groupRepository.findJoinRequest(group.getId(), viewerUserId).orElse(null)
                : null;
        return CommunityPublicGroupDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .imageUrl(group.getImageUrl())
                .thumbnailUrl(group.getThumbnailUrl())
                .imageStatus(group.getImageStatus())
                .memberCount(group.getMemberCount() != null ? group.getMemberCount() : 0)
                .myRole(membership != null ? membership.getRole() : null)
                .joinRequestStatus(joinRequest != null ? joinRequest.getStatus() : null)
                .build();
    }

    private List<CommunityActivityDTO> findRecentPublicActivities(String targetUserId) {
        return repository.findPostsPaged(PUBLIC_PROFILE_ACTIVITY_SCAN_LIMIT, null)
                .getItems().stream()
                .filter(post -> Objects.equals(targetUserId, post.getAuthorUserId()))
                .filter(post -> !Boolean.TRUE.equals(post.getAnonymous()))
                .filter(post -> !StringUtils.hasText(post.getGroupId()))
                .limit(PUBLIC_PROFILE_ACTIVITY_LIMIT)
                .map(post -> CommunityActivityDTO.builder()
                        .id(post.getId())
                        .type("POST")
                        .title(post.getTitle())
                        .createdAt(post.getCreatedAt())
                        .build())
                .toList();
    }

    private String resolveVisibility(Group group) {
        return StringUtils.hasText(group.getVisibility()) ? group.getVisibility() : "PRIVATE";
    }

    private String resolveNickname(Profile profile) {
        return profile != null && StringUtils.hasText(profile.getNickname()) ? profile.getNickname() : "사용자";
    }

    private String resolveAvatarUrl(Profile profile) {
        return profile != null && StringUtils.hasText(profile.getAvatarUrl()) ? profile.getAvatarUrl() : "";
    }

    private String resolveThumbnailUrl(Profile profile) {
        return profile != null && StringUtils.hasText(profile.getThumbnailUrl()) ? profile.getThumbnailUrl() : "";
    }

    private void validateText(String value) {
        if (!StringUtils.hasText(value)) {
            throw new CommunityException(CommunityErrorCode.EMPTY_CONTENT);
        }
    }
}
