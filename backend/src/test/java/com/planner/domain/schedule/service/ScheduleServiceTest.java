package com.planner.domain.schedule.service;

import com.planner.domain.schedule.converter.ScheduleConverter;
import com.planner.domain.schedule.dto.ScheduleCreateReqDTO;
import com.planner.domain.schedule.dto.ScheduleResDTO;
import com.planner.domain.schedule.dto.ScheduleUpdateReqDTO;
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
            req.setEndTime("2025-03-10T10:00:00Z");
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

            then(repository).should().delete(USER_ID, "s1");
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
