package com.planner.domain.schedule.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScheduleParticipantResDTO {
    private String userId;
    private String nickname;
    private String avatarUrl;
    private String thumbnailUrl;
    private String imageId;
    private String imageStatus;
}
