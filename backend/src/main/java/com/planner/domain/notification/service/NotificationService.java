package com.planner.domain.notification.service;

import com.planner.domain.notification.converter.NotificationConverter;
import com.planner.domain.notification.dto.req.NotificationSettingsUpdateReqDTO;
import com.planner.domain.notification.dto.res.NotificationResDTO;
import com.planner.domain.notification.dto.res.NotificationSettingsResDTO;
import com.planner.domain.notification.error.NotificationErrorCode;
import com.planner.domain.notification.error.NotificationException;
import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.NotificationSettings;
import com.planner.domain.notification.repository.NotificationRepository;
import com.planner.global.pagination.Cursor;
import com.planner.global.pagination.CursorCodec;
import com.planner.global.pagination.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int DEFAULT_LIMIT = 20;

    private final NotificationRepository repository;
    private final CursorCodec cursorCodec;

    /** 커서 기반 페이지네이션 조회 */
    public CursorPageResult<NotificationResDTO> getAllPaged(String userId, String type, Boolean isRead, Integer limit, String cursorToken) {
        int size = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;

        CursorPageResult<Notification> page = repository.findByUserIdPaged(userId, size, cursor);

        // type/isRead 필터는 메모리 필터링 (DynamoDB FilterExpression으로 전환 가능)
        List<NotificationResDTO> filtered = page.getItems().stream()
                .filter(n -> type == null || type.equals(n.getType()))
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
        if (req.getGroupAlarm() != null) settings.setGroupAlarm(req.getGroupAlarm());
        if (req.getRemindOneDayBefore() != null) settings.setRemindOneDayBefore(req.getRemindOneDayBefore());
        if (req.getRemindOneDayBeforeTime() != null) settings.setRemindOneDayBeforeTime(req.getRemindOneDayBeforeTime());
        if (req.getRemindSameDay() != null) settings.setRemindSameDay(req.getRemindSameDay());
        if (req.getRemindSameDayTime() != null) settings.setRemindSameDayTime(req.getRemindSameDayTime());
        if (req.getImportantAlarm() != null) settings.setImportantAlarm(req.getImportantAlarm());
        if (req.getImportantAlarmTime() != null) settings.setImportantAlarmTime(req.getImportantAlarmTime());
        settings.setUpdatedAt(Instant.now().toString());

        repository.saveSettings(settings);
        return NotificationConverter.toSettingsResponse(settings);
    }

    private NotificationSettings createDefaultSettings(String userId) {
        NotificationSettings s = NotificationSettings.builder()
                .pk("USER#" + userId).sk("NOTIF_SETTINGS")
                .scheduleAlarm(true).groupAlarm(true)
                .remindOneDayBefore(true).remindOneDayBeforeTime("22:00")
                .remindSameDay(true).remindSameDayTime("08:00")
                .importantAlarm(true).importantAlarmTime("08:00")
                .updatedAt(Instant.now().toString())
                .build();
        repository.saveSettings(s);
        return s;
    }
}
