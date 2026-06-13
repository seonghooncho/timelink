package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupResDTO {
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private String imageId;
    private String imageStatus;
    private String inviteCode;
    private String visibility;
    private int memberCount;
    private String myRole;
    private String joinRequestStatus;
    private GroupScheduleSummaryDTO nextSchedule;
    private String createdAt;
}
