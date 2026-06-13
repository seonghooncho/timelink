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
import com.planner.domain.storage.model.ImagePurpose;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.model.ImageUpload;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
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
    private final StorageService storageService;

    public ScheduleResDTO create(String userId, ScheduleCreateReqDTO req) {
        Schedule schedule = ScheduleConverter.toEntity(userId, req);
        applyScheduleImage(userId, schedule, req.getImageId());
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
        String previousTitle = schedule.getTitle();
        String previousContent = schedule.getContent();
        String previousCategory = schedule.getCategory();
        Boolean previousImportant = schedule.getIsImportant();
        String previousStartTime = schedule.getStartTime();
        Double previousDuration = schedule.getDuration();
        String previousImageId = schedule.getImageId();
        String previousImageUrl = schedule.getImageUrl();

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
            ScheduleConverter.applyGroupScheduleIndex(schedule);
        }
        if (req.getIsCompleted() != null) schedule.setIsCompleted(req.getIsCompleted());
        if (req.getHasAlarm() != null) schedule.setHasAlarm(req.getHasAlarm());
        if (req.getImageUrl() != null) schedule.setImageUrl(req.getImageUrl());
        applyScheduleImage(userId, schedule, req.getImageId());
        schedule.setUpdatedAt(Instant.now().toString());
        boolean shouldNotifyGroupUpdate = hasGroupScheduleDisplayChange(
                schedule,
                previousTitle,
                previousContent,
                previousCategory,
                previousImportant,
                previousStartTime,
                previousDuration,
                previousImageId,
                previousImageUrl
        );

        repository.save(schedule);
        reminderSchedulingService.rescheduleSchedule(userId, schedule);
        if (shouldNotifyGroupUpdate) {
            notifyGroupScheduleUpdated(userId, schedule);
        }
        return ScheduleConverter.toResponse(schedule);
    }

    public void delete(String userId, String scheduleId) {
        Schedule schedule = repository.findByUserIdAndScheduleId(userId, scheduleId)
                .orElseThrow(() -> new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));
        reminderSchedulingService.deleteScheduleJobs(userId, scheduleId);
        repository.delete(userId, scheduleId);
        notifyGroupScheduleDeleted(userId, schedule);
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
        notifyGroupScheduleMembers(
                userId,
                schedule,
                memberUserId -> notificationService.createGroupScheduleNotification(memberUserId, schedule)
        );
    }

    private void notifyGroupScheduleUpdated(String userId, Schedule schedule) {
        notifyGroupScheduleMembers(
                userId,
                schedule,
                memberUserId -> notificationService.createGroupScheduleUpdatedNotification(memberUserId, schedule)
        );
    }

    private void notifyGroupScheduleDeleted(String userId, Schedule schedule) {
        notifyGroupScheduleMembers(
                userId,
                schedule,
                memberUserId -> notificationService.createGroupScheduleDeletedNotification(memberUserId, schedule)
        );
    }

    private void notifyGroupScheduleMembers(String userId, Schedule schedule, Consumer<String> notifyMember) {
        if (!StringUtils.hasText(schedule.getGroupId())) {
            return;
        }

        List<GroupMember> members = groupRepository.findMembersByGroupId(schedule.getGroupId());
        for (GroupMember member : members) {
            if (!userId.equals(member.getUserId())) {
                notifyMember.accept(member.getUserId());
            }
        }
    }

    private boolean hasGroupScheduleDisplayChange(
            Schedule schedule,
            String previousTitle,
            String previousContent,
            String previousCategory,
            Boolean previousImportant,
            String previousStartTime,
            Double previousDuration,
            String previousImageId,
            String previousImageUrl
    ) {
        return StringUtils.hasText(schedule.getGroupId())
                && (!Objects.equals(previousTitle, schedule.getTitle())
                || !Objects.equals(previousContent, schedule.getContent())
                || !Objects.equals(previousCategory, schedule.getCategory())
                || !Objects.equals(previousImportant, schedule.getIsImportant())
                || !Objects.equals(previousStartTime, schedule.getStartTime())
                || !Objects.equals(previousDuration, schedule.getDuration())
                || !Objects.equals(previousImageId, schedule.getImageId())
                || !Objects.equals(previousImageUrl, schedule.getImageUrl()));
    }

    private void applyScheduleImage(String userId, Schedule schedule, String imageId) {
        if (!StringUtils.hasText(imageId)) {
            return;
        }

        ImageUpload upload = storageService.attachImageToTarget(userId, imageId, ImagePurpose.SCHEDULE, schedule.getId());
        schedule.setImageId(upload.getImageId());
        schedule.setImageStatus(upload.getStatus());
        schedule.setImageUploadKey(upload.getUploadKey());
        schedule.setImageObjectKey(upload.getPublicKey());
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getPublicUrl())) {
            schedule.setImageUrl(upload.getPublicUrl());
        }
    }
}
