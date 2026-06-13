package com.planner.domain.notification.service;

import com.planner.domain.notification.converter.NotificationConverter;
import com.planner.domain.notification.dto.NotificationResDTO;
import com.planner.domain.notification.dto.NotificationSettingsResDTO;
import com.planner.domain.notification.dto.NotificationSettingsUpdateReqDTO;
import com.planner.domain.notification.dto.ScheduledNotificationEvent;
import com.planner.domain.notification.error.NotificationErrorCode;
import com.planner.domain.notification.error.NotificationException;
import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.NotificationSettings;
import com.planner.domain.notification.repository.NotificationRepository;
import com.planner.domain.schedule.model.Schedule;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 알림센터 저장, 사용자 알림 설정, 푸시 발송 진입점을 함께 관리한다.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int DEFAULT_LIMIT = 20;
    private static final String TYPE_GROUP = "group";
    private static final String CATEGORY_GROUP = "group";

    private final NotificationRepository repository;
    private final ReminderSchedulingService reminderSchedulingService;
    private final WebPushService webPushService;
    private final CursorCodec cursorCodec;

    /** 커서 기반 페이지네이션 조회 */
    public CursorPageResult<NotificationResDTO> getAllPaged(String userId, String type, Boolean isRead, Integer limit, String cursorToken) {
        int size = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;

        CursorPageResult<Notification> page = repository.findByUserIdPaged(userId, size, cursor);

        // type/isRead 필터는 메모리 필터링 (DynamoDB FilterExpression으로 전환 가능)
        List<NotificationResDTO> filtered = page.getItems().stream()
                .filter(n -> type == null || matchesType(n, type))
                .filter(n -> isRead == null || isRead.equals(n.getIsRead()))
                .map(NotificationConverter::toResponse)
                .collect(Collectors.toList());

        return CursorPageResult.<NotificationResDTO>builder()
                .items(filtered)
                .nextCursor(page.getNextCursor())
                .build();
    }

    public CustomResponse.PageMeta toPageMeta(CursorPageResult<?> page, int perPage) {
        return CustomResponse.PageMeta.builder()
                .perPage(perPage)
                .nextCursor(page.getNextCursor() != null ? cursorCodec.encode(page.getNextCursor()) : null)
                .build();
    }

    public void markRead(String userId, String notifId) {
        Notification n = repository.findByUserIdAndNotifId(userId, notifId)
                .orElseThrow(() -> new NotificationException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));
        n.setIsRead(true);
        repository.saveNotification(n);
    }

    public Map<String, Integer> markAllRead(String userId) {
        List<Notification> unread = repository.findByUserId(userId).stream()
                .filter(n -> !Boolean.TRUE.equals(n.getIsRead()))
                .collect(Collectors.toList());
        for (Notification n : unread) {
            n.setIsRead(true);
            repository.saveNotification(n);
        }
        return Map.of("updatedCount", unread.size());
    }

    public void delete(String userId, String notifId) {
        Notification n = repository.findByUserIdAndNotifId(userId, notifId)
                .orElseThrow(() -> new NotificationException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));
        repository.deleteNotification(userId, n.getSk());
    }

    public NotificationSettingsResDTO getSettings(String userId) {
        NotificationSettings settings = repository.findSettings(userId)
                .orElseGet(() -> createDefaultSettings(userId));
        return NotificationConverter.toSettingsResponse(settings);
    }

    public NotificationSettingsResDTO updateSettings(String userId, NotificationSettingsUpdateReqDTO req) {
        NotificationSettings settings = repository.findSettings(userId)
                .orElseGet(() -> createDefaultSettings(userId));

        if (req.getScheduleAlarm() != null) settings.setScheduleAlarm(req.getScheduleAlarm());
        if (req.getGroupAlarm() != null) {
            // 과거 클라이언트는 groupAlarm으로 푸시 여부를 보냈으므로 pushAlarm이 없을 때만 맞춰준다.
            settings.setGroupAlarm(req.getGroupAlarm());
            if (req.getPushAlarm() == null) {
                settings.setPushAlarm(req.getGroupAlarm());
            }
        }
        if (req.getPushAlarm() != null) settings.setPushAlarm(req.getPushAlarm());
        if (req.getRemindOneDayBefore() != null) settings.setRemindOneDayBefore(req.getRemindOneDayBefore());
        if (req.getRemindOneDayBeforeTime() != null) settings.setRemindOneDayBeforeTime(req.getRemindOneDayBeforeTime());
        if (req.getRemindSameDay() != null) settings.setRemindSameDay(req.getRemindSameDay());
        if (req.getRemindSameDayTime() != null) settings.setRemindSameDayTime(req.getRemindSameDayTime());
        if (req.getImportantAlarm() != null) settings.setImportantAlarm(req.getImportantAlarm());
        if (req.getImportantAlarmTime() != null) settings.setImportantAlarmTime(req.getImportantAlarmTime());
        validateReminderSettings(settings, req);
        settings.setUpdatedAt(Instant.now().toString());

        repository.saveSettings(settings);
        reminderSchedulingService.syncUserReminders(userId, settings);
        return NotificationConverter.toSettingsResponse(settings);
    }

    public void createGroupNotification(String userId, String title, String content) {
        createGroupNotification(userId, title, content, false);
    }

    public void createGroupNotification(String userId, String title, String content, String targetType, String targetId, String targetUrl) {
        createGroupNotification(userId, title, content, false, targetType, targetId, targetUrl);
    }

    public void createGroupScheduleNotification(String userId, Schedule schedule) {
        createGroupNotification(
                userId,
                "모임 일정이 추가되었습니다",
                "%s 일정이 추가되었습니다.".formatted(schedule.getTitle()),
                Boolean.TRUE.equals(schedule.getIsImportant())
        );
    }

    public void createGroupScheduleUpdatedNotification(String userId, Schedule schedule) {
        createGroupNotification(
                userId,
                "모임 일정이 변경되었습니다",
                "%s 일정이 변경되었습니다.".formatted(schedule.getTitle()),
                Boolean.TRUE.equals(schedule.getIsImportant())
        );
    }

    public void createGroupScheduleDeletedNotification(String userId, Schedule schedule) {
        createGroupNotification(
                userId,
                "모임 일정이 삭제되었습니다",
                "%s 일정이 삭제되었습니다.".formatted(schedule.getTitle()),
                Boolean.TRUE.equals(schedule.getIsImportant())
        );
    }

    private void createGroupNotification(String userId, String title, String content, boolean important) {
        createGroupNotification(userId, title, content, important, null, null, null);
    }

    private void createGroupNotification(
            String userId,
            String title,
            String content,
            boolean important,
            String targetType,
            String targetId,
            String targetUrl
    ) {
        NotificationSettings settings = repository.findSettings(userId)
                .orElseGet(() -> createDefaultSettings(userId));

        createNotificationIfAbsent(
                userId,
                UUID.randomUUID().toString(),
                TYPE_GROUP,
                title,
                content,
                CATEGORY_GROUP,
                important,
                targetType,
                targetId,
                targetUrl,
                isPushEnabled(settings)
        );
    }

    public void deliverScheduledNotification(ScheduledNotificationEvent event) {
        NotificationSettings settings = repository.findSettings(event.getUserId())
                .orElseGet(() -> createDefaultSettings(event.getUserId()));
        if ("schedule".equals(event.getType()) && !Boolean.TRUE.equals(settings.getScheduleAlarm())) {
            // 예약 시점 이후 사용자가 일정 알림을 껐으면 알림센터 저장과 푸시 모두 건너뛴다.
            reminderSchedulingService.deleteJobRecord(event.getUserId(), event.getJobId());
            return;
        }

        createNotificationIfAbsent(
                event.getUserId(),
                event.getNotificationId(),
                event.getType(),
                event.getTitle(),
                event.getContent(),
                event.getCategory(),
                Boolean.TRUE.equals(event.getImportant()),
                null,
                null,
                null,
                isPushEnabled(settings)
        );
        reminderSchedulingService.deleteJobRecord(event.getUserId(), event.getJobId());
    }

    private NotificationSettings createDefaultSettings(String userId) {
        NotificationSettings s = NotificationSettings.builder()
                .pk("USER#" + userId).sk("NOTIF_SETTINGS")
                .scheduleAlarm(false).groupAlarm(true).pushAlarm(false)
                .remindOneDayBefore(false).remindOneDayBeforeTime("22:00")
                .remindSameDay(false).remindSameDayTime("08:00")
                .importantAlarm(false).importantAlarmTime("08:00")
                .updatedAt(Instant.now().toString())
                .build();
        repository.saveSettings(s);
        return s;
    }

    private boolean isPushEnabled(NotificationSettings settings) {
        // 신규 설정은 pushAlarm을 우선하고, 기존 데이터만 groupAlarm으로 보정한다.
        return settings.getPushAlarm() != null
                ? Boolean.TRUE.equals(settings.getPushAlarm())
                : Boolean.TRUE.equals(settings.getGroupAlarm());
    }

    private boolean matchesType(Notification notification, String type) {
        if (TYPE_GROUP.equals(type)) {
            return TYPE_GROUP.equals(notification.getType()) || CATEGORY_GROUP.equals(notification.getCategory());
        }
        return type.equals(notification.getType());
    }

    private void createNotificationIfAbsent(
            String userId,
            String id,
            String type,
            String title,
            String content,
            String category,
            boolean important
    ) {
        createNotificationIfAbsent(userId, id, type, title, content, category, important, null, null, null, true);
    }

    private void createNotificationIfAbsent(
            String userId,
            String id,
            String type,
            String title,
            String content,
            String category,
            boolean important,
            String targetType,
            String targetId,
            String targetUrl,
            boolean pushEnabled
    ) {
        if (repository.findByUserIdAndNotifId(userId, id).isPresent()) {
            return;
        }

        Notification notification = Notification.builder()
                .pk("USER#" + userId)
                .sk("NOTIF#" + id)
                .id(id)
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .category(category)
                .targetType(targetType)
                .targetId(targetId)
                .targetUrl(targetUrl)
                .isImportant(important)
                .isRead(false)
                .createdAt(Instant.now().toString())
                .build();
        repository.saveNotification(notification);
        if (pushEnabled) {
            webPushService.sendNotification(userId, notification);
        }
    }

    private void validateReminderSettings(NotificationSettings settings, NotificationSettingsUpdateReqDTO req) {
        boolean requestedReminderOn = Boolean.TRUE.equals(req.getRemindOneDayBefore())
                || Boolean.TRUE.equals(req.getRemindSameDay())
                || Boolean.TRUE.equals(req.getImportantAlarm());
        if (requestedReminderOn && !Boolean.TRUE.equals(settings.getScheduleAlarm())) {
            throw new NotificationException(NotificationErrorCode.INVALID_NOTIFICATION_SETTINGS);
        }
    }

}
