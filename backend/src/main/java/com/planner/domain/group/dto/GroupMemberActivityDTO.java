package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupMemberActivityDTO {
    private String id;
    private String type;
    private String title;
    private String createdAt;
}
