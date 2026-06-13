package com.planner.domain.community.converter;

import com.planner.domain.community.dto.CommunityCommentResDTO;
import com.planner.domain.community.dto.CommunityPostCreateReqDTO;
import com.planner.domain.community.dto.CommunityPostResDTO;
import com.planner.domain.community.model.CommunityComment;
import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.profile.model.Profile;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.UUID;

public final class CommunityConverter {

    private static final String POST_LIST_PK = "COMMUNITY#POSTS";

    private CommunityConverter() {
    }

    public static CommunityPost toPost(String userId, Profile profile, CommunityPostCreateReqDTO req) {
        String id = UUID.randomUUID().toString();
        String now = Instant.now().toString();
        return basePost(id, userId, profile, req, now)
                .gsi5pk(POST_LIST_PK)
                .gsi5sk("CREATED_AT#" + now + "#POST#" + id)
                .build();
    }

    public static CommunityPost toGroupPost(String groupId, String userId, Profile profile, CommunityPostCreateReqDTO req) {
        String id = UUID.randomUUID().toString();
        String now = Instant.now().toString();
        return basePost(id, userId, profile, req, now)
                .groupId(groupId)
                .gsi6pk("GROUP#" + groupId + "#POSTS")
                .gsi6sk("CREATED_AT#" + now + "#POST#" + id)
                .build();
    }

    public static CommunityComment toComment(String postId, String userId, Profile profile, String content) {
        String id = UUID.randomUUID().toString();
        String now = Instant.now().toString();
        return CommunityComment.builder()
                .pk("POST#" + postId)
                .sk("COMMENT#" + now + "#" + id)
                .id(id)
                .postId(postId)
                .content(content.trim())
                .authorUserId(userId)
                .authorNickname(resolveNickname(profile))
                .authorAvatarUrl(resolveAvatarUrl(profile))
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static CommunityPostResDTO toPostResponse(CommunityPost post, String userId, boolean likedByMe) {
        boolean anonymous = Boolean.TRUE.equals(post.getAnonymous());
        boolean mine = userId != null && userId.equals(post.getAuthorUserId());
        return CommunityPostResDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .groupId(post.getGroupId())
                .memberOnly(Boolean.TRUE.equals(post.getMemberOnly()))
                .locked(false)
                .anonymous(anonymous)
                .imageUrl(post.getImageUrl())
                .imageId(post.getImageId())
                .imageStatus(post.getImageStatus())
                .authorUserId(anonymous ? null : post.getAuthorUserId())
                .authorNickname(anonymous ? "익명" : resolveNickname(post.getAuthorNickname()))
                .authorAvatarUrl(anonymous ? "" : resolveAvatarUrl(post.getAuthorAvatarUrl()))
                .likeCount(post.getLikeCount() != null ? post.getLikeCount() : 0)
                .commentCount(post.getCommentCount() != null ? post.getCommentCount() : 0)
                .likedByMe(likedByMe)
                .mine(mine)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private static CommunityPost.CommunityPostBuilder basePost(
            String id,
            String userId,
            Profile profile,
            CommunityPostCreateReqDTO req,
            String now) {
        return CommunityPost.builder()
                .pk("POST#" + id)
                .sk("METADATA")
                .id(id)
                .title(req.getTitle().trim())
                .content(req.getContent().trim())
                .memberOnly(Boolean.TRUE.equals(req.getMemberOnly()))
                .anonymous(Boolean.TRUE.equals(req.getAnonymous()))
                .authorUserId(userId)
                .authorNickname(resolveNickname(profile))
                .authorAvatarUrl(resolveAvatarUrl(profile))
                .likeCount(0)
                .commentCount(0)
                .createdAt(now)
                .updatedAt(now);
    }

    public static CommunityCommentResDTO toCommentResponse(CommunityComment comment, String userId) {
        return CommunityCommentResDTO.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .content(comment.getContent())
                .authorUserId(comment.getAuthorUserId())
                .authorNickname(comment.getAuthorNickname())
                .authorAvatarUrl(comment.getAuthorAvatarUrl())
                .mine(userId != null && userId.equals(comment.getAuthorUserId()))
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private static String resolveNickname(Profile profile) {
        if (profile != null && StringUtils.hasText(profile.getNickname())) {
            return profile.getNickname();
        }
        return "사용자";
    }

    private static String resolveAvatarUrl(Profile profile) {
        if (profile != null && StringUtils.hasText(profile.getAvatarUrl())) {
            return profile.getAvatarUrl();
        }
        return "";
    }

    private static String resolveNickname(String nickname) {
        return StringUtils.hasText(nickname) ? nickname : "사용자";
    }

    private static String resolveAvatarUrl(String avatarUrl) {
        return StringUtils.hasText(avatarUrl) ? avatarUrl : "";
    }
}
