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
import com.planner.domain.schedule.model.GroupScheduleParticipant;
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
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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
        if (StringUtils.hasText(req.getGroupId())) {
            return createGroupSchedule(userId, req);
        }

        Schedule schedule = ScheduleConverter.toEntity(userId, req);
        applyScheduleImage(userId, schedule, req.getImageId());
        repository.save(schedule);
        reminderSchedulingService.rescheduleSchedule(userId, schedule);
        notifyGroupScheduleCreated(userId, schedule);
        return ScheduleConverter.toResponse(schedule);
    }

    private ScheduleResDTO createGroupSchedule(String userId, ScheduleCreateReqDTO req) {
        List<GroupMember> members = groupRepository.findMembersByGroupId(req.getGroupId());
        if (members.stream().noneMatch(member -> userId.equals(member.getUserId()))) {
            throw new ScheduleException(ScheduleErrorCode.INVALID_GROUP_SCHEDULE_PARTICIPANT);
        }

        Set<String> memberUserIds = members.stream()
                .map(GroupMember::getUserId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> participantUserIds = resolveParticipantUserIds(userId, req, memberUserIds);
        String groupScheduleId = java.util.UUID.randomUUID().toString();
        String now = Instant.now().toString();
        List<Schedule> createdSchedules = new ArrayList<>();

        for (String participantUserId : participantUserIds) {
            Schedule schedule = ScheduleConverter.toEntity(participantUserId, req);
            schedule.setGroupScheduleId(groupScheduleId);
            schedule.setGroupScheduleCreatedBy(userId);
            if (userId.equals(participantUserId)) {
                applyScheduleImage(userId, schedule, req.getImageId());
            }
            repository.save(schedule);
            repository.saveParticipant(GroupScheduleParticipant.builder()
                    .pk("GROUP_SCHEDULE#" + groupScheduleId)
                    .sk("PARTICIPANT#" + participantUserId)
                    .groupScheduleId(groupScheduleId)
                    .groupId(req.getGroupId())
                    .userId(participantUserId)
                    .scheduleId(schedule.getId())
                    .createdBy(userId)
                    .createdAt(now)
                    .build());
            reminderSchedulingService.rescheduleSchedule(participantUserId, schedule);
            createdSchedules.add(schedule);
        }

        Schedule ownerSchedule = createdSchedules.stream()
                .filter(schedule -> userId.equals(schedule.getUserId()))
                .findFirst()
                .orElse(createdSchedules.get(0));
        notifyGroupScheduleCreated(userId, ownerSchedule, participantUserIds);
        return ScheduleConverter.toResponse(ownerSchedule);
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

        boolean displayUpdate = hasDisplayUpdate(req);
        if (isJoinedGroupSchedule(schedule) && displayUpdate && !isGroupScheduleOwner(userId, schedule)) {
            throw new ScheduleException(ScheduleErrorCode.NOT_GROUP_SCHEDULE_OWNER);
        }

        applyScheduleUpdate(userId, schedule, req, true);
        repository.save(schedule);
        reminderSchedulingService.rescheduleSchedule(userId, schedule);

        if (StringUtils.hasText(schedule.getGroupId()) && displayUpdate) {
            if (isJoinedGroupSchedule(schedule)) {
                propagateGroupScheduleUpdate(userId, schedule);
            }
            notifyGroupScheduleUpdated(userId, schedule);
        }
        return ScheduleConverter.toResponse(schedule);
    }

    public void delete(String userId, String scheduleId) {
        Schedule schedule = repository.findByUserIdAndScheduleId(userId, scheduleId)
                .orElseThrow(() -> new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));
        if (isJoinedGroupSchedule(schedule)) {
            if (!isGroupScheduleOwner(userId, schedule)) {
                leaveGroupSchedule(userId, scheduleId);
                return;
            }
            notifyGroupScheduleDeleted(userId, schedule);
            deleteGroupScheduleCopies(schedule);
            return;
        }

        reminderSchedulingService.deleteScheduleJobs(userId, scheduleId);
        repository.delete(userId, scheduleId);
        notifyGroupScheduleDeleted(userId, schedule);
    }

    public void leaveGroupSchedule(String userId, String scheduleId) {
        Schedule schedule = repository.findByUserIdAndScheduleId(userId, scheduleId)
                .orElseThrow(() -> new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));
        if (!isJoinedGroupSchedule(schedule)) {
            throw new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND);
        }
        if (isGroupScheduleOwner(userId, schedule)) {
            throw new ScheduleException(ScheduleErrorCode.CANNOT_LEAVE_OWN_GROUP_SCHEDULE);
        }

        reminderSchedulingService.deleteScheduleJobs(userId, scheduleId);
        repository.delete(userId, scheduleId);
        repository.deleteParticipant(schedule.getGroupScheduleId(), userId);
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

    private Set<String> resolveParticipantUserIds(String userId, ScheduleCreateReqDTO req, Set<String> memberUserIds) {
        Set<String> selected = new LinkedHashSet<>();
        if (req.getParticipantUserIds() == null || req.getParticipantUserIds().isEmpty()) {
            selected.addAll(memberUserIds);
        } else {
            selected.addAll(req.getParticipantUserIds().stream()
                    .filter(StringUtils::hasText)
                    .map(String::trim)
                    .toList());
        }
        selected.add(userId);
        if (!memberUserIds.containsAll(selected)) {
            throw new ScheduleException(ScheduleErrorCode.INVALID_GROUP_SCHEDULE_PARTICIPANT);
        }
        return selected;
    }

    private boolean isJoinedGroupSchedule(Schedule schedule) {
        return StringUtils.hasText(schedule.getGroupId()) && StringUtils.hasText(schedule.getGroupScheduleId());
    }

    private boolean isGroupScheduleOwner(String userId, Schedule schedule) {
        return !StringUtils.hasText(schedule.getGroupScheduleCreatedBy())
                || userId.equals(schedule.getGroupScheduleCreatedBy());
    }

    private boolean hasDisplayUpdate(ScheduleUpdateReqDTO req) {
        return req.getTitle() != null
                || req.getContent() != null
                || req.getCategory() != null
                || req.getIsImportant() != null
                || req.getStartTime() != null
                || req.getDuration() != null
                || req.getImageUrl() != null
                || req.getImageId() != null;
    }

    private void applyScheduleUpdate(String userId, Schedule schedule, ScheduleUpdateReqDTO req, boolean includePersonalFields) {
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
        if (includePersonalFields && req.getIsCompleted() != null) schedule.setIsCompleted(req.getIsCompleted());
        if (includePersonalFields && req.getHasAlarm() != null) schedule.setHasAlarm(req.getHasAlarm());
        if (req.getImageUrl() != null) schedule.setImageUrl(req.getImageUrl());
        applyScheduleImage(userId, schedule, req.getImageId());
        schedule.setUpdatedAt(Instant.now().toString());
    }

    private void propagateGroupScheduleUpdate(String userId, Schedule source) {
        List<GroupScheduleParticipant> participants = repository.findParticipantsByGroupScheduleId(source.getGroupScheduleId());
        for (GroupScheduleParticipant participant : participants) {
            if (source.getUserId().equals(participant.getUserId())) {
                continue;
            }
            repository.findByUserIdAndScheduleId(participant.getUserId(), participant.getScheduleId())
                    .ifPresent(target -> {
                        copyGroupScheduleDisplayFields(source, target);
                        repository.save(target);
                        reminderSchedulingService.rescheduleSchedule(participant.getUserId(), target);
                    });
        }
    }

    private void copyGroupScheduleDisplayFields(Schedule source, Schedule target) {
        target.setTitle(source.getTitle());
        target.setContent(source.getContent());
        target.setCategory(source.getCategory());
        target.setIsImportant(source.getIsImportant());
        target.setStartTime(source.getStartTime());
        target.setEndTime(source.getEndTime());
        target.setDuration(source.getDuration());
        target.setGroupId(source.getGroupId());
        target.setGroupScheduleId(source.getGroupScheduleId());
        target.setGroupScheduleCreatedBy(source.getGroupScheduleCreatedBy());
        target.setImageUrl(source.getImageUrl());
        target.setImageId(source.getImageId());
        target.setImageStatus(source.getImageStatus());
        target.setImageUploadKey(source.getImageUploadKey());
        target.setImageObjectKey(source.getImageObjectKey());
        target.setGsi1sk(source.getStartTime());
        ScheduleConverter.applyGroupScheduleIndex(target);
        target.setUpdatedAt(Instant.now().toString());
    }

    private void deleteGroupScheduleCopies(Schedule schedule) {
        List<GroupScheduleParticipant> participants = repository.findParticipantsByGroupScheduleId(schedule.getGroupScheduleId());
        for (GroupScheduleParticipant participant : participants) {
            reminderSchedulingService.deleteScheduleJobs(participant.getUserId(), participant.getScheduleId());
            repository.delete(participant.getUserId(), participant.getScheduleId());
            repository.deleteParticipant(schedule.getGroupScheduleId(), participant.getUserId());
        }
    }

    private void notifyGroupScheduleCreated(String userId, Schedule schedule) {
        notifyGroupScheduleMembers(
                userId,
                schedule,
                memberUserId -> notificationService.createGroupScheduleNotification(memberUserId, schedule)
        );
    }

    private void notifyGroupScheduleCreated(String userId, Schedule schedule, Set<String> participantUserIds) {
        if (!StringUtils.hasText(schedule.getGroupId())) {
            return;
        }
        participantUserIds.stream()
                .filter(memberUserId -> !userId.equals(memberUserId))
                .forEach(memberUserId -> notificationService.createGroupScheduleNotification(memberUserId, schedule));
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

        if (StringUtils.hasText(schedule.getGroupScheduleId())) {
            repository.findParticipantsByGroupScheduleId(schedule.getGroupScheduleId()).stream()
                    .map(GroupScheduleParticipant::getUserId)
                    .filter(memberUserId -> !userId.equals(memberUserId))
                    .forEach(notifyMember);
            return;
        }

        List<GroupMember> members = groupRepository.findMembersByGroupId(schedule.getGroupId());
        for (GroupMember member : members) {
            if (!userId.equals(member.getUserId())) {
                notifyMember.accept(member.getUserId());
            }
        }
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
