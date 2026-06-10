package com.planner.domain.notification.service;

import com.planner.domain.notification.dto.NotificationResDTO;
import com.planner.domain.notification.dto.NotificationSettingsResDTO;
import com.planner.domain.notification.dto.NotificationSettingsUpdateReqDTO;
import com.planner.domain.notification.dto.ScheduledNotificationEvent;
import com.planner.domain.notification.error.NotificationException;
import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.NotificationSettings;
import com.planner.domain.notification.repository.NotificationRepository;
import com.planner.domain.schedule.model.Schedule;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository repository;
    @Mock private ReminderSchedulingService reminderSchedulingService;
    @Mock private WebPushService webPushService;
    @Mock private CursorCodec cursorCodec;
    @InjectMocks private NotificationService service;

    private Notification sampleNotif(String id, String type, boolean read) {
        return Notification.builder()
                .pk("USER#user1").sk("NOTIF#" + id)
                .id(id).userId("user1").type(type)
                .title("Test").content("Content")
                .isRead(read).createdAt("2025-01-01T00:00:00Z")
                .build();
    }

    private NotificationSettings settings(boolean scheduleAlarm, boolean groupAlarm) {
        return NotificationSettings.builder()
                .pk("USER#user1").sk("NOTIF_SETTINGS")
                .scheduleAlarm(scheduleAlarm).groupAlarm(groupAlarm)
                .remindOneDayBefore(false).remindOneDayBeforeTime("22:00")
                .remindSameDay(false).remindSameDayTime("08:00")
                .importantAlarm(false).importantAlarmTime("08:00")
                .updatedAt("2025-01-01T00:00:00Z")
                .build();
    }

    private Schedule sampleSchedule(String id, String startTime) {
        return Schedule.builder()
                .pk("USER#user1").sk("SCHEDULE#" + id)
                .id(id).userId("user1")
                .title("회의").category("task")
                .isImportant(false)
                .startTime(startTime)
                .isCompleted(false)
                .hasAlarm(true)
                .build();
    }

    @Test
    @DisplayName("getAllPaged — 타입/읽음 필터링")
    void getAll_filters() {
        when(repository.findByUserIdPaged("user1", 20, null))
                .thenReturn(CursorPageResult.<Notification>builder().items(List.of(
                sampleNotif("n1", "schedule", false),
                sampleNotif("n2", "system", true)
        )).build());

        CursorPageResult<NotificationResDTO> result = service.getAllPaged("user1", "schedule", null, null, null);
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getType()).isEqualTo("schedule");
    }

    @Test
    @DisplayName("markRead — 직접 키 조회로 읽음 처리")
    void markRead_success() {
        Notification n = sampleNotif("n1", "schedule", false);
        when(repository.findByUserIdAndNotifId("user1", "n1")).thenReturn(Optional.of(n));

        service.markRead("user1", "n1");

        assertThat(n.getIsRead()).isTrue();
        verify(repository).saveNotification(n);
    }

    @Test
    @DisplayName("markRead — 존재하지 않으면 예외")
    void markRead_notFound_throws() {
        when(repository.findByUserIdAndNotifId("user1", "none")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead("user1", "none"))
                .isInstanceOf(NotificationException.class);
    }

    @Test
    @DisplayName("markAllRead — 읽지 않은 알림만 업데이트")
    void markAllRead_updatesUnreadOnly() {
        when(repository.findByUserId("user1")).thenReturn(List.of(
                sampleNotif("n1", "schedule", false),
                sampleNotif("n2", "system", true),
                sampleNotif("n3", "schedule", false)
        ));

        Map<String, Integer> result = service.markAllRead("user1");
        assertThat(result.get("updatedCount")).isEqualTo(2);
        verify(repository, times(2)).saveNotification(any());
    }

    @Test
    @DisplayName("delete — 직접 키 조회로 삭제")
    void delete_success() {
        Notification n = sampleNotif("n1", "schedule", false);
        when(repository.findByUserIdAndNotifId("user1", "n1")).thenReturn(Optional.of(n));

        service.delete("user1", "n1");
        verify(repository).deleteNotification("user1", "NOTIF#n1");
    }

    @Test
    @DisplayName("getSettings — 기본값 생성")
    void getSettings_createsDefault() {
        when(repository.findSettings("user1")).thenReturn(Optional.empty());

        NotificationSettingsResDTO result = service.getSettings("user1");
        assertThat(result.getScheduleAlarm()).isFalse();
        assertThat(result.getGroupAlarm()).isFalse();
        assertThat(result.getRemindOneDayBefore()).isFalse();
        assertThat(result.getRemindSameDay()).isFalse();
        assertThat(result.getImportantAlarm()).isFalse();
        verify(repository).saveSettings(any());
    }

    @Test
    @DisplayName("updateSettings — 일정 알림을 꺼도 리마인드 선택값은 보존한다")
    void updateSettings_partialUpdate() {
        NotificationSettings settings = NotificationSettings.builder()
                .pk("USER#user1").sk("NOTIF_SETTINGS")
                .scheduleAlarm(true).groupAlarm(true)
                .remindOneDayBefore(true).remindOneDayBeforeTime("22:00")
                .remindSameDay(true).remindSameDayTime("08:00")
                .importantAlarm(true).importantAlarmTime("08:00")
                .build();
        when(repository.findSettings("user1")).thenReturn(Optional.of(settings));

        NotificationSettingsUpdateReqDTO req = new NotificationSettingsUpdateReqDTO();
        req.setScheduleAlarm(false);

        NotificationSettingsResDTO result = service.updateSettings("user1", req);
        assertThat(result.getScheduleAlarm()).isFalse();
        assertThat(result.getRemindOneDayBefore()).isTrue();
        assertThat(result.getRemindSameDay()).isTrue();
        assertThat(result.getImportantAlarm()).isTrue();
        verify(reminderSchedulingService).syncUserReminders(eq("user1"), same(settings));
    }

    @Test
    @DisplayName("updateSettings — 일정 알림이 꺼져 있으면 리마인드를 새로 켤 수 없다")
    void updateSettings_rejectsReminderOnWhenScheduleAlarmOff() {
        when(repository.findSettings("user1")).thenReturn(Optional.of(settings(false, false)));

        NotificationSettingsUpdateReqDTO req = new NotificationSettingsUpdateReqDTO();
        req.setRemindOneDayBefore(true);
        req.setRemindSameDay(true);
        req.setImportantAlarm(true);

        assertThatThrownBy(() -> service.updateSettings("user1", req))
                .isInstanceOf(NotificationException.class);
        verify(repository, never()).saveSettings(any());
        verify(reminderSchedulingService, never()).syncUserReminders(anyString(), any());
    }

    @Test
    @DisplayName("deliverScheduledNotification — 예약 이벤트를 알림센터와 푸시로 전달한다")
    void deliverScheduledNotification_savesAndPushes() {
        ScheduledNotificationEvent event = new ScheduledNotificationEvent();
        event.setJobId("one-day-s1");
        event.setUserId("user1");
        event.setNotificationId("remind-one-day-s1");
        event.setType("schedule");
        event.setTitle("내일 일정 리마인드");
        event.setContent("3월 10일 09:00 · 회의");
        event.setCategory("task");
        event.setImportant(false);

        when(repository.findByUserIdAndNotifId("user1", "remind-one-day-s1"))
                .thenReturn(Optional.empty());

        service.deliverScheduledNotification(event);

        verify(repository).saveNotification(argThat(notification ->
                "remind-one-day-s1".equals(notification.getId())
                        && "schedule".equals(notification.getType())
                        && notification.getContent().contains("회의")
        ));
        verify(webPushService).sendNotification(eq("user1"), any(Notification.class));
        verify(reminderSchedulingService).deleteJobRecord("user1", "one-day-s1");
    }
}
