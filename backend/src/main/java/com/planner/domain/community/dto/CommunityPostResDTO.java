package com.planner.domain.community.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommunityPostResDTO {
    private String id;
    private String title;
    private String content;
    private String groupId;
    private String authorUserId;
    private String authorNickname;
    private String authorAvatarUrl;
    private Integer likeCount;
    private Integer commentCount;
    private Boolean likedByMe;
    private Boolean mine;
    private String createdAt;
    private String updatedAt;
}
