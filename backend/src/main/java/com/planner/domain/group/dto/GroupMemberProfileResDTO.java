package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GroupMemberProfileResDTO {
    private String id;
    private String userId;
    private String role;
    private String nickname;
    private String avatarUrl;
    private String thumbnailUrl;
    private String imageId;
    private String imageStatus;
    private String joinedAt;
    private Boolean mine;
    private List<GroupMemberActivityDTO> recentActivities;
}
