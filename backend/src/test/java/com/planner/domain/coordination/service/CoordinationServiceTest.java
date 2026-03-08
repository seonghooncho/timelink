package com.planner.domain.coordination.service;

import com.planner.domain.coordination.dto.req.CoordinationCreateReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationSubmitReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationUpdateReqDTO;
import com.planner.domain.coordination.dto.res.*;
import com.planner.domain.coordination.error.CoordinationException;
import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.model.CoordinationResponse;
import com.planner.domain.coordination.repository.CoordinationRepository;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class CoordinationServiceTest {

    @Mock
    private CoordinationRepository repository;

    @Mock
    private GroupRepository groupRepository;

    @InjectMocks
    private CoordinationService service;

    private static final String USER_ID = "user-1";
    private static final String GROUP_ID = "group-1";
    private static final String COORD_ID = "coord-1";

    private GroupMember mockMember() {
        return GroupMember.builder()
                .pk("GROUP#" + GROUP_ID).sk("MEMBER#" + USER_ID)
                .userId(USER_ID).role("member").build();
    }

    private Coordination createCoordination(String createdBy) {
        return Coordination.builder()
                .pk("GROUP#" + GROUP_ID).sk("COORD#" + COORD_ID)
                .id(COORD_ID).groupId(GROUP_ID).createdBy(createdBy)
                .title("회의 시간 조율").mode("once")
                .dates(List.of("2025-03-15")).startHour(9).endHour(18)
                .status("active").createdAt("2025-03-09T00:00:00Z")
                .build();
    }

    @Nested
    @DisplayName("create")
    class Create {

        @Test
        @DisplayName("멤버가 조율을 생성한다")
        void shouldCreate() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            willDoNothing().given(repository).saveCoordination(any());

            CoordinationCreateReqDTO req = new CoordinationCreateReqDTO();
            req.setTitle("조율");
            req.setMode("once");
            req.setDates(List.of("2025-03-15"));
            req.setStartHour(9);
            req.setEndHour(18);

            CoordinationResDTO result = service.create(USER_ID, GROUP_ID, req);

            assertThat(result.getTitle()).isEqualTo("조율");
            assertThat(result.getStatus()).isEqualTo("active");
        }

        @Test
        @DisplayName("멤버가 아니면 예외를 던진다")
        void shouldThrowWhenNotMember() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.empty());

            CoordinationCreateReqDTO req = new CoordinationCreateReqDTO();
            req.setTitle("조율");
            req.setMode("once");
            req.setDates(List.of("2025-03-15"));
            req.setStartHour(9);
            req.setEndHour(18);

            assertThatThrownBy(() -> service.create(USER_ID, GROUP_ID, req))
                    .isInstanceOf(GroupException.class);
        }
    }

    @Nested
    @DisplayName("getDetail")
    class GetDetail {

        @Test
        @DisplayName("히트맵과 내 응답을 포함한 상세를 반환한다")
        void shouldReturnDetailWithHeatmap() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination(USER_ID)));

            CoordinationResponse r1 = CoordinationResponse.builder()
                    .pk("COORD#" + COORD_ID).sk("RESP#user-1#2025-03-15#10")
                    .userId("user-1").date("2025-03-15").hour(10).build();
            CoordinationResponse r2 = CoordinationResponse.builder()
                    .pk("COORD#" + COORD_ID).sk("RESP#user-2#2025-03-15#10")
                    .userId("user-2").date("2025-03-15").hour(10).build();
            given(repository.findResponses(COORD_ID)).willReturn(List.of(r1, r2));

            CoordinationDetailResDTO result = service.getDetail(USER_ID, GROUP_ID, COORD_ID);

            assertThat(result.getHeatmap()).hasSize(1);
            assertThat(result.getHeatmap().get(0).getCount()).isEqualTo(2);
            assertThat(result.getMyResponses()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("생성자가 상태를 변경한다")
        void shouldUpdateStatus() {
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination(USER_ID)));

            CoordinationUpdateReqDTO req = new CoordinationUpdateReqDTO();
            req.setStatus("closed");

            CoordinationResDTO result = service.update(USER_ID, GROUP_ID, COORD_ID, req);

            assertThat(result.getStatus()).isEqualTo("closed");
        }

        @Test
        @DisplayName("생성자가 아니면 예외를 던진다")
        void shouldThrowWhenNotCreator() {
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("other-user")));

            assertThatThrownBy(() -> service.update(USER_ID, GROUP_ID, COORD_ID, new CoordinationUpdateReqDTO()))
                    .isInstanceOf(CoordinationException.class);
        }
    }

    @Nested
    @DisplayName("submitResponses")
    class SubmitResponses {

        @Test
        @DisplayName("기존 응답을 삭제하고 새 응답을 저장한다")
        void shouldReplaceResponses() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));

            CoordinationResponse existing = CoordinationResponse.builder()
                    .pk("COORD#" + COORD_ID).sk("RESP#user-1#2025-03-15#9")
                    .userId(USER_ID).build();
            given(repository.findUserResponses(COORD_ID, USER_ID)).willReturn(List.of(existing));

            CoordinationSubmitReqDTO req = new CoordinationSubmitReqDTO();
            SlotEntryDTO slot1 = new SlotEntryDTO("2025-03-15", 10);
            SlotEntryDTO slot2 = new SlotEntryDTO("2025-03-15", 11);
            req.setSlots(List.of(slot1, slot2));

            SubmitResultDTO result = service.submitResponses(USER_ID, GROUP_ID, COORD_ID, req);

            assertThat(result.getSubmittedCount()).isEqualTo(2);
            then(repository).should().deleteResponse(eq(COORD_ID), anyString());
            then(repository).should(times(2)).saveResponse(any());
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("생성자가 아니면 삭제 시 예외를 던진다")
        void shouldThrowWhenNotCreator() {
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("other")));

            assertThatThrownBy(() -> service.delete(USER_ID, GROUP_ID, COORD_ID))
                    .isInstanceOf(CoordinationException.class);
        }
    }
}
