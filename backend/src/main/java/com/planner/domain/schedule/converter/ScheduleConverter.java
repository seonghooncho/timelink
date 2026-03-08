package com.planner.domain.schedule.converter;

import com.planner.domain.schedule.dto.req.ScheduleCreateReqDTO;
import com.planner.domain.schedule.dto.res.ScheduleResDTO;
import com.planner.domain.schedule.model.Schedule;

import java.time.Instant;
import java.util.UUID;

public final class ScheduleConverter {

    private ScheduleConverter() {}

    public static Schedule toEntity(String userId, ScheduleCreateReqDTO req) {
        String id = UUID.randomUUID().toString();
        String now = Instant.now().toString();

        return Schedule.builder()
                .pk("USER#" + userId)
                .sk("SCHEDULE#" + id)
                .id(id)
                .userId(userId)
                .title(req.getTitle())
                .content(req.getContent())
                .category(req.getCategory())
                .isImportant(req.getIsImportant())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .duration(req.getDuration())
                .isCompleted(false)
                .hasAlarm(req.getHasAlarm())
                .groupId(req.getGroupId())
                .gsi1pk("USER#" + userId)
                .gsi1sk(req.getStartTime())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static ScheduleResDTO toResponse(Schedule s) {
        return ScheduleResDTO.builder()
                .id(s.getId())
                .title(s.getTitle())
                .content(s.getContent())
                .category(s.getCategory())
                .isImportant(s.getIsImportant())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .duration(s.getDuration())
                .isCompleted(s.getIsCompleted())
                .hasAlarm(s.getHasAlarm())
                .groupId(s.getGroupId())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
