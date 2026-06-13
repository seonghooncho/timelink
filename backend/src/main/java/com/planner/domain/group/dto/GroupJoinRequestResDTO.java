package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupJoinRequestResDTO {
    private String id;
    private String groupId;
    private String userId;
    private String message;
    private String status;
    private String nickname;
    private String avatarUrl;
    private String createdAt;
    private String decidedAt;
}
