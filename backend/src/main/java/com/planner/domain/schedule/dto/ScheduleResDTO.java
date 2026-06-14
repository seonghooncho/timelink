package com.planner.domain.schedule.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ScheduleResDTO {
    private String id;
    private String title;
    private String content;
    private String category;
    private Boolean isImportant;
    private String startTime;
    /** 하위 호환용 필드이며 신규 화면 표시는 startTime + duration을 기준으로 한다. */
    private String endTime;
    private Double duration;
    private Boolean isCompleted;
    private Boolean hasAlarm;
    private String groupId;
    private String groupScheduleId;
    private String groupScheduleCreatedBy;
    private Boolean groupScheduleOwner;
    private Boolean groupScheduleParticipant;
    private String imageUrl;
    private String imageId;
    private String imageStatus;
    private List<ScheduleParticipantResDTO> participants;
    private String createdAt;
    private String updatedAt;
}
