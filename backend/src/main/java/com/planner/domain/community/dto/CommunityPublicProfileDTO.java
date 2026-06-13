package com.planner.domain.community.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CommunityPublicProfileDTO {
    private String userId;
    private String nickname;
    private String avatarUrl;
    private String thumbnailUrl;
    private List<CommunityPublicGroupDTO> publicGroups;
    private List<CommunityActivityDTO> recentActivities;
}
