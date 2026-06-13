package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupIntroPostDTO {
    private String id;
    private String title;
    private String content;
    private String contentSnippet;
    private String authorUserId;
    private String authorNickname;
    private String authorAvatarUrl;
    private Integer likeCount;
    private Integer commentCount;
    private Boolean likedByMe;
    private Boolean mine;
    private Boolean memberOnly;
    private Boolean locked;
    private String imageUrl;
    private String imageId;
    private String imageStatus;
    private String createdAt;
    private String updatedAt;
}
