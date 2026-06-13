package com.planner.domain.community.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommunityPublicGroupDTO {
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private String thumbnailUrl;
    private String imageStatus;
    private int memberCount;
    private String myRole;
    private String joinRequestStatus;
}
