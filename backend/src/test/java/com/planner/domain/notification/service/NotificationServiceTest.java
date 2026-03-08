package com.planner.domain.notification.service;

import com.planner.domain.notification.dto.req.NotificationSettingsUpdateReqDTO;
import com.planner.domain.notification.dto.res.NotificationResDTO;
import com.planner.domain.notification.dto.res.NotificationSettingsResDTO;
import com.planner.domain.notification.error.NotificationException;
import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.NotificationSettings;
import com.planner.domain.notification.repository.NotificationRepository;
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
    @InjectMocks private NotificationService service;

    private Notification sampleNotif(String id, String type, boolean read) {
        return Notification.builder()
                .pk("USER#user1").sk("NOTIF#" + id)
                .id(id).userId("user1").type(type)
                .title("Test").content("Content")
                .isRead(read).createdAt("2025-01-01T00:00:00Z")
                .build();
    }

    @Test
    @DisplayName("getAll — 타입/읽음 필터링")
    void getAll_filters() {
        when(repository.findByUserId("user1")).thenReturn(List.of(
                sampleNotif("n1", "schedule", false),
                sampleNotif("n2", "system", true)
        ));

        List<NotificationResDTO> result = service.getAll("user1", "schedule", null);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo("schedule");
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
        assertThat(result.getScheduleAlarm()).isTrue();
        verify(repository).saveSettings(any());
    }

    @Test
    @DisplayName("updateSettings — 부분 업데이트")
    void updateSettings_partialUpdate() {
        NotificationSettings settings = NotificationSettings.builder()
                .pk("USER#user1").sk("NOTIF_SETTINGS")
                .scheduleAlarm(true).groupAlarm(true)
                .build();
        when(repository.findSettings("user1")).thenReturn(Optional.of(settings));

        NotificationSettingsUpdateReqDTO req = new NotificationSettingsUpdateReqDTO();
        req.setScheduleAlarm(false);

        NotificationSettingsResDTO result = service.updateSettings("user1", req);
        assertThat(result.getScheduleAlarm()).isFalse();
    }
}
