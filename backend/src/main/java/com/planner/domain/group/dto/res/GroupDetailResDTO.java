package com.planner.domain.group.dto.res;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GroupDetailResDTO {
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private String inviteCode;
    private String createdBy;
    private List<GroupMemberResDTO> members;
    private String createdAt;
}
