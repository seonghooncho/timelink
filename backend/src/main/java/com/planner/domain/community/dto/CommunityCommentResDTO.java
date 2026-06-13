package com.planner.domain.community.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommunityCommentResDTO {
    private String id;
    private String postId;
    private String content;
    private String authorUserId;
    private String authorNickname;
    private String authorAvatarUrl;
    private Boolean mine;
    private String createdAt;
    private String updatedAt;
}
