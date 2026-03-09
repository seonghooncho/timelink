package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupMemberResDTO {
    private String id;
    private String userId;
    private String role;
    private String nickname;
    private String avatarUrl;
    private String joinedAt;
}
