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
import com.planner.global.cursor.CursorPageResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private ScheduleRepository repository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ReminderSchedulingService reminderSchedulingService;

    @InjectMocks
    private ScheduleService service;

    private static final String USER_ID = "test-user-123";

    private Schedule createSampleSchedule(String id) {
        return Schedule.builder()
                .pk("USER#" + USER_ID)
                .sk("SCHEDULE#" + id)
                .id(id)
                .userId(USER_ID)
                .title("테스트 일정")
                .content("테스트 내용")
                .category("task")
                .isImportant(false)
                .startTime("2025-03-10T09:00:00Z")
                .endTime("2025-03-10T10:00:00Z")
                .duration(1.0)
                .isCompleted(false)
                .hasAlarm(true)
                .createdAt("2025-03-09T00:00:00Z")
                .updatedAt("2025-03-09T00:00:00Z")
                .build();
    }

    private GroupMember sampleMember(String groupId, String userId) {
        return GroupMember.builder()
                .pk("GROUP#" + groupId).sk("MEMBER#" + userId)
                .groupId(groupId).userId(userId)
                .build();
    }

    @Nested
    @DisplayName("create")
    class Create {

        @Test
        @DisplayName("일정을 생성하고 응답을 반환한다")
        void shouldCreateSchedule() {
            // given
            ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
            req.setTitle("새 일정");
            req.setContent("내용");
            req.setCategory("task");
            req.setStartTime("2025-03-10T09:00:00Z");
            req.setDuration(1.0);
            req.setHasAlarm(true);

            willDoNothing().given(repository).save(any(Schedule.class));

            // when
            ScheduleResDTO result = service.create(USER_ID, req);

            // then
            assertThat(result.getTitle()).isEqualTo("새 일정");
            assertThat(result.getCategory()).isEqualTo("task");
            assertThat(result.getIsCompleted()).isFalse();
            assertThat(result.getId()).isNotNull();

            ArgumentCaptor<Schedule> captor = ArgumentCaptor.forClass(Schedule.class);
            then(repository).should().save(captor.capture());
            Schedule saved = captor.getValue();
            assertThat(saved.getPk()).isEqualTo("USER#" + USER_ID);
            assertThat(saved.getGsi1pk()).isEqualTo("USER#" + USER_ID);
            assertThat(saved.getGsi1sk()).isEqualTo("2025-03-10T09:00:00Z");
            assertThat(saved.getGsi4pk()).isNull();
            assertThat(saved.getGsi4sk()).isNull();
            assertThat(saved.getEndTime()).isEqualTo("2025-03-10T10:00:00Z");
            assertThat(saved.getDuration()).isEqualTo(1.0);
            then(reminderSchedulingService).should().rescheduleSchedule(eq(USER_ID), any(Schedule.class));
        }

        @Test
        @DisplayName("소요시간이 없으면 1시간으로 저장한다")
        void shouldUseDefaultDurationWhenMissing() {
            ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
            req.setTitle("새 일정");
            req.setCategory("task");
            req.setStartTime("2025-03-10T09:00:00");

            ScheduleResDTO result = service.create(USER_ID, req);

            assertThat(result.getDuration()).isEqualTo(1.0);
            assertThat(result.getEndTime()).isEqualTo("2025-03-10T10:00:00");
        }

        @Test
        @DisplayName("시작 시간과 소요시간이 날짜를 넘기면 예외를 던진다")
        void shouldRejectScheduleCrossingDay() {
            ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
            req.setTitle("밤 일정");
            req.setCategory("task");
            req.setStartTime("2025-03-10T23:30:00");
            req.setDuration(1.0);

            assertThatThrownBy(() -> service.create(USER_ID, req))
                    .isInstanceOf(ScheduleException.class)
                    .extracting("errorCode")
                    .isEqualTo(ScheduleErrorCode.SCHEDULE_CROSSES_DAY);
        }

        @Test
        @DisplayName("그룹 일정 생성 시 작성자를 제외한 그룹 멤버에게 알림을 생성한다")
        void shouldNotifyGroupMembersWhenGroupScheduleCreated() {
            // given
            ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
            req.setTitle("그룹 회의");
            req.setContent("내용");
            req.setCategory("group");
            req.setStartTime("2025-03-10T09:00:00Z");
            req.setDuration(1.0);
            req.setHasAlarm(true);
            req.setGroupId("g1");

            given(groupRepository.findMembersByGroupId("g1"))
                    .willReturn(List.of(sampleMember("g1", USER_ID), sampleMember("g1", "member-2")));

            // when
            service.create(USER_ID, req);

            // then
            then(notificationService).should()
                    .createGroupScheduleNotification(eq("member-2"), any(Schedule.class));
            then(notificationService).should(never())
                    .createGroupScheduleNotification(eq(USER_ID), any(Schedule.class));
            then(repository).should().save(argThat(schedule ->
                    "GROUP#g1".equals(schedule.getGsi4pk())
                            && schedule.getGsi4sk() != null
                            && schedule.getGsi4sk().startsWith("START#2025-03-10T09:00:00Z#SCHEDULE#")
            ));
        }
    }

    @Nested
    @DisplayName("getAllPaged")
    class GetAll {

        @Test
        @DisplayName("사용자의 모든 일정을 조회한다")
        void shouldReturnAllSchedules() {
            // given
            given(repository.findByUserIdPaged(USER_ID, 20, null))
                    .willReturn(CursorPageResult.<Schedule>builder().items(List.of(
                            createSampleSchedule("s1"),
                            createSampleSchedule("s2")
                    )).build());

            // when
            CursorPageResult<ScheduleResDTO> result = service.getAllPaged(USER_ID, null, null);

            // then
            assertThat(result.getItems()).hasSize(2);
        }

        @Test
        @DisplayName("일정이 없으면 빈 리스트를 반환한다")
        void shouldReturnEmptyList() {
            given(repository.findByUserIdPaged(USER_ID, 20, null))
                    .willReturn(CursorPageResult.<Schedule>builder().items(List.of()).build());

            CursorPageResult<ScheduleResDTO> result = service.getAllPaged(USER_ID, null, null);

            assertThat(result.getItems()).isEmpty();
        }
    }

    @Nested
    @DisplayName("getById")
    class GetById {

        @Test
        @DisplayName("존재하는 일정을 조회한다")
        void shouldReturnSchedule() {
            Schedule schedule = createSampleSchedule("s1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));

            ScheduleResDTO result = service.getById(USER_ID, "s1");

            assertThat(result.getId()).isEqualTo("s1");
            assertThat(result.getTitle()).isEqualTo("테스트 일정");
        }

        @Test
        @DisplayName("존재하지 않는 일정이면 ScheduleException을 던진다")
        void shouldThrowWhenNotFound() {
            given(repository.findByUserIdAndScheduleId(USER_ID, "invalid"))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(USER_ID, "invalid"))
                    .isInstanceOf(ScheduleException.class);
        }
    }

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("일정 제목과 완료 상태를 업데이트한다")
        void shouldUpdateFields() {
            Schedule schedule = createSampleSchedule("s1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));

            ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
            req.setTitle("수정된 제목");
            req.setIsCompleted(true);

            ScheduleResDTO result = service.update(USER_ID, "s1", req);

            assertThat(result.getTitle()).isEqualTo("수정된 제목");
            assertThat(result.getIsCompleted()).isTrue();
            then(repository).should().save(any(Schedule.class));
        }

        @Test
        @DisplayName("그룹 일정의 표시 정보가 변경되면 작성자를 제외한 그룹 멤버에게 알림을 보낸다")
        void shouldNotifyGroupMembersWhenGroupScheduleUpdated() {
            Schedule schedule = createSampleSchedule("s1");
            schedule.setGroupId("g1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));
            given(groupRepository.findMembersByGroupId("g1"))
                    .willReturn(List.of(sampleMember("g1", USER_ID), sampleMember("g1", "member-2")));

            ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
            req.setTitle("수정된 그룹 회의");

            service.update(USER_ID, "s1", req);

            then(notificationService).should()
                    .createGroupScheduleUpdatedNotification(eq("member-2"), any(Schedule.class));
            then(notificationService).should(never())
                    .createGroupScheduleUpdatedNotification(eq(USER_ID), any(Schedule.class));
        }

        @Test
        @DisplayName("그룹 일정 완료 상태만 바뀌면 그룹 변경 알림을 보내지 않는다")
        void shouldNotNotifyGroupMembersWhenOnlyCompletionChanges() {
            Schedule schedule = createSampleSchedule("s1");
            schedule.setGroupId("g1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));

            ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
            req.setIsCompleted(true);

            service.update(USER_ID, "s1", req);

            then(notificationService).should(never())
                    .createGroupScheduleUpdatedNotification(anyString(), any(Schedule.class));
        }

        @Test
        @DisplayName("startTime 변경 시 GSI1SK도 업데이트한다")
        void shouldUpdateGsiOnStartTimeChange() {
            Schedule schedule = createSampleSchedule("s1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));

            ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
            req.setStartTime("2025-04-01T08:00:00Z");

            service.update(USER_ID, "s1", req);

            ArgumentCaptor<Schedule> captor = ArgumentCaptor.forClass(Schedule.class);
            then(repository).should().save(captor.capture());
            assertThat(captor.getValue().getGsi1sk()).isEqualTo("2025-04-01T08:00:00Z");
            then(reminderSchedulingService).should().rescheduleSchedule(eq(USER_ID), any(Schedule.class));
        }

        @Test
        @DisplayName("소요시간 변경 시 종료 시간을 다시 계산한다")
        void shouldRecalculateEndTimeOnDurationChange() {
            Schedule schedule = createSampleSchedule("s1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));

            ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
            req.setDuration(2.5);

            ScheduleResDTO result = service.update(USER_ID, "s1", req);

            assertThat(result.getDuration()).isEqualTo(2.5);
            assertThat(result.getEndTime()).isEqualTo("2025-03-10T11:30:00Z");
        }

        @Test
        @DisplayName("수정 후 날짜를 넘기는 소요시간은 예외를 던진다")
        void shouldRejectUpdateCrossingDay() {
            Schedule schedule = createSampleSchedule("s1");
            schedule.setStartTime("2025-03-10T23:00:00");
            schedule.setDuration(1.0);
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));

            ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
            req.setDuration(1.5);

            assertThatThrownBy(() -> service.update(USER_ID, "s1", req))
                    .isInstanceOf(ScheduleException.class)
                    .extracting("errorCode")
                    .isEqualTo(ScheduleErrorCode.SCHEDULE_CROSSES_DAY);
        }

        @Test
        @DisplayName("존재하지 않는 일정 업데이트 시 예외를 던진다")
        void shouldThrowWhenNotFound() {
            given(repository.findByUserIdAndScheduleId(USER_ID, "invalid"))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> service.update(USER_ID, "invalid", new ScheduleUpdateReqDTO()))
                    .isInstanceOf(ScheduleException.class);
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("일정을 삭제한다")
        void shouldDelete() {
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(createSampleSchedule("s1")));

            service.delete(USER_ID, "s1");

            then(reminderSchedulingService).should().deleteScheduleJobs(USER_ID, "s1");
            then(repository).should().delete(USER_ID, "s1");
        }

        @Test
        @DisplayName("그룹 일정 삭제 시 작성자를 제외한 그룹 멤버에게 알림을 보낸다")
        void shouldNotifyGroupMembersWhenGroupScheduleDeleted() {
            Schedule schedule = createSampleSchedule("s1");
            schedule.setGroupId("g1");
            given(repository.findByUserIdAndScheduleId(USER_ID, "s1"))
                    .willReturn(Optional.of(schedule));
            given(groupRepository.findMembersByGroupId("g1"))
                    .willReturn(List.of(sampleMember("g1", USER_ID), sampleMember("g1", "member-2")));

            service.delete(USER_ID, "s1");

            then(notificationService).should()
                    .createGroupScheduleDeletedNotification(eq("member-2"), any(Schedule.class));
            then(notificationService).should(never())
                    .createGroupScheduleDeletedNotification(eq(USER_ID), any(Schedule.class));
        }

        @Test
        @DisplayName("존재하지 않는 일정 삭제 시 예외를 던진다")
        void shouldThrowWhenNotFound() {
            given(repository.findByUserIdAndScheduleId(USER_ID, "invalid"))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> service.delete(USER_ID, "invalid"))
                    .isInstanceOf(ScheduleException.class);
        }
    }
}
