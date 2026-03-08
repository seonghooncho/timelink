package com.planner.domain.group.dto.res;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupResDTO {
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private String inviteCode;
    private int memberCount;
    private String myRole;
    private String createdAt;
}
