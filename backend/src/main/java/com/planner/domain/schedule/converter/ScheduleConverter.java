package com.planner.domain.schedule.converter;

import com.planner.domain.schedule.dto.ScheduleCreateReqDTO;
import com.planner.domain.schedule.dto.ScheduleResDTO;
import com.planner.domain.schedule.model.Schedule;
import com.planner.domain.schedule.util.ScheduleTimeCalculator;

import java.time.Instant;
import java.util.UUID;

public final class ScheduleConverter {

    private ScheduleConverter() {}

    public static Schedule toEntity(String userId, ScheduleCreateReqDTO req) {
        String id = UUID.randomUUID().toString();
        String now = Instant.now().toString();
        double duration = ScheduleTimeCalculator.resolveDuration(req.getDuration());
        String endTime = ScheduleTimeCalculator.calculateEndTime(req.getStartTime(), duration);

        Schedule schedule = Schedule.builder()
                .pk("USER#" + userId)
                .sk("SCHEDULE#" + id)
                .id(id)
                .userId(userId)
                .title(req.getTitle())
                .content(req.getContent())
                .category(req.getCategory())
                .isImportant(req.getIsImportant())
                .startTime(req.getStartTime())
                .endTime(endTime)
                .duration(duration)
                .isCompleted(false)
                .hasAlarm(req.getHasAlarm())
                .groupId(req.getGroupId())
                .groupScheduleId(null)
                .groupScheduleCreatedBy(null)
                .imageUrl(req.getImageUrl())
                .imageId(req.getImageId())
                .gsi1pk("USER#" + userId)
                .gsi1sk(req.getStartTime())
                .createdAt(now)
                .updatedAt(now)
                .build();
        applyGroupScheduleIndex(schedule);
        return schedule;
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
                .groupScheduleId(s.getGroupScheduleId())
                .groupScheduleCreatedBy(s.getGroupScheduleCreatedBy())
                .groupScheduleOwner(s.getGroupScheduleCreatedBy() == null || s.getGroupScheduleCreatedBy().equals(s.getUserId()))
                .groupScheduleParticipant(s.getGroupScheduleId() != null)
                .imageUrl(s.getImageUrl())
                .imageId(s.getImageId())
                .imageStatus(s.getImageStatus())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    public static void applyGroupScheduleIndex(Schedule schedule) {
        if (schedule.getGroupId() == null || schedule.getGroupId().isBlank()) {
            schedule.setGsi4pk(null);
            schedule.setGsi4sk(null);
            return;
        }
        if (schedule.getGroupScheduleId() != null
                && !schedule.getGroupScheduleId().isBlank()
                && schedule.getGroupScheduleCreatedBy() != null
                && !schedule.getGroupScheduleCreatedBy().equals(schedule.getUserId())) {
            schedule.setGsi4pk(null);
            schedule.setGsi4sk(null);
            return;
        }
        schedule.setGsi4pk("GROUP#" + schedule.getGroupId());
        schedule.setGsi4sk("START#" + schedule.getStartTime() + "#SCHEDULE#" + schedule.getId());
    }
}
