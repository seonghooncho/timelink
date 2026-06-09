package com.planner.domain.schedule.service;

import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.notification.service.NotificationService;
import com.planner.domain.notification.service.ReminderSchedulingService;
import com.planner.domain.schedule.converter.ScheduleConverter;
import com.planner.domain.schedule.dto.ScheduleCreateReqDTO;
import com.planner.domain.schedule.dto.ScheduleResDTO;
import com.planner.domain.schedule.dto.ScheduleUpdateReqDTO;
import com.planner.domain.schedule.error.ScheduleErrorCode;
import com.planner.domain.schedule.error.ScheduleException;
import com.planner.domain.schedule.model.Schedule;
import com.planner.domain.schedule.repository.ScheduleRepository;
import com.planner.domain.schedule.util.ScheduleTimeCalculator;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final int DEFAULT_LIMIT = 20;

    private final ScheduleRepository repository;
    private final GroupRepository groupRepository;
    private final NotificationService notificationService;
    private final ReminderSchedulingService reminderSchedulingService;
    private final CursorCodec cursorCodec;

    public ScheduleResDTO create(String userId, ScheduleCreateReqDTO req) {
        Schedule schedule = ScheduleConverter.toEntity(userId, req);
        repository.save(schedule);
        reminderSchedulingService.rescheduleSchedule(userId, schedule);
        notifyGroupScheduleCreated(userId, schedule);
        return ScheduleConverter.toResponse(schedule);
    }

    /** 커서 기반 페이지네이션 전체 조회 */
    public CursorPageResult<ScheduleResDTO> getAllPaged(String userId, Integer limit, String cursorToken) {
        int size = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;

        CursorPageResult<Schedule> page = repository.findByUserIdPaged(userId, size, cursor);
        return toDtoPage(page);
    }

    /** 커서 기반 페이지네이션 시간 범위 조회 */
    public CursorPageResult<ScheduleResDTO> getByTimeRangePaged(String userId, String start, String end, Integer limit, String cursorToken) {
        int size = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;

        CursorPageResult<Schedule> page = repository.findByUserIdAndTimeRangePaged(userId, start, end, size, cursor);
        return toDtoPage(page);
    }

    public ScheduleResDTO getById(String userId, String scheduleId) {
        Schedule schedule = repository.findByUserIdAndScheduleId(userId, scheduleId)
                .orElseThrow(() -> new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));
        return ScheduleConverter.toResponse(schedule);
    }

    public ScheduleResDTO update(String userId, String scheduleId, ScheduleUpdateReqDTO req) {
        Schedule schedule = repository.findByUserIdAndScheduleId(userId, scheduleId)
                .orElseThrow(() -> new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));

        if (req.getTitle() != null) schedule.setTitle(req.getTitle());
        if (req.getContent() != null) schedule.setContent(req.getContent());
        if (req.getCategory() != null) schedule.setCategory(req.getCategory());
        if (req.getIsImportant() != null) schedule.setIsImportant(req.getIsImportant());
        if (req.getStartTime() != null || req.getDuration() != null) {
            String nextStartTime = req.getStartTime() != null ? req.getStartTime() : schedule.getStartTime();
            Double nextDurationHint = req.getDuration() != null ? req.getDuration() : schedule.getDuration();
            double nextDuration = ScheduleTimeCalculator.resolveDuration(
                    nextDurationHint != null && nextDurationHint > 0 ? nextDurationHint : null
            );
            schedule.setStartTime(nextStartTime);
            schedule.setGsi1sk(nextStartTime);
            schedule.setDuration(nextDuration);
            schedule.setEndTime(ScheduleTimeCalculator.calculateEndTime(nextStartTime, nextDuration));
        }
        if (req.getIsCompleted() != null) schedule.setIsCompleted(req.getIsCompleted());
        if (req.getHasAlarm() != null) schedule.setHasAlarm(req.getHasAlarm());
        schedule.setUpdatedAt(Instant.now().toString());

        repository.save(schedule);
        reminderSchedulingService.rescheduleSchedule(userId, schedule);
        return ScheduleConverter.toResponse(schedule);
    }

    public void delete(String userId, String scheduleId) {
        repository.findByUserIdAndScheduleId(userId, scheduleId)
                .orElseThrow(() -> new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));
        reminderSchedulingService.deleteScheduleJobs(userId, scheduleId);
        repository.delete(userId, scheduleId);
    }

    /** 인코딩된 nextCursor를 포함하는 DTO 페이지 변환 */
    public CustomResponse.PageMeta toPageMeta(CursorPageResult<?> page, int perPage) {
        return CustomResponse.PageMeta.builder()
                .perPage(perPage)
                .nextCursor(page.getNextCursor() != null ? cursorCodec.encode(page.getNextCursor()) : null)
                .build();
    }

    private CursorPageResult<ScheduleResDTO> toDtoPage(CursorPageResult<Schedule> page) {
        List<ScheduleResDTO> dtos = page.getItems().stream()
                .map(ScheduleConverter::toResponse)
                .collect(Collectors.toList());
        return CursorPageResult.<ScheduleResDTO>builder()
                .items(dtos)
                .nextCursor(page.getNextCursor())
                .build();
    }

    private void notifyGroupScheduleCreated(String userId, Schedule schedule) {
        if (!StringUtils.hasText(schedule.getGroupId())) {
            return;
        }

        List<GroupMember> members = groupRepository.findMembersByGroupId(schedule.getGroupId());
        for (GroupMember member : members) {
            if (!userId.equals(member.getUserId())) {
                notificationService.createGroupScheduleNotificationIfEnabled(member.getUserId(), schedule);
            }
        }
    }
}
