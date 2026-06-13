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
import com.planner.domain.notification.service.NotificationService;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
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

    @Mock
    private NotificationService notificationService;

    @Mock
    private CursorCodec cursorCodec;

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

    private GroupMember mockMember(String userId) {
        return GroupMember.builder()
                .pk("GROUP#" + GROUP_ID).sk("MEMBER#" + userId)
                .userId(userId).role("member").build();
    }

    private Coordination createCoordination(String createdBy) {
        return Coordination.builder()
                .pk("GROUP#" + GROUP_ID).sk("COORD#" + COORD_ID)
                .id(COORD_ID).groupId(GROUP_ID).createdBy(createdBy)
                .title("회의 시간 조율").mode("once")
                .dates(List.of("2025-03-15")).startHour(9).endHour(18)
                .responseCount(0)
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
            given(groupRepository.findMembersByGroupId(GROUP_ID))
                    .willReturn(List.of(mockMember(USER_ID), mockMember("user-2")));
            willDoNothing().given(repository).saveCoordination(any());

            CoordinationCreateReqDTO req = new CoordinationCreateReqDTO();
            req.setTitle(" 조율 ");
            req.setDescription(" 가능한 시간을 남겨주세요 ");
            req.setMode("once");
            req.setDates(List.of("2025-03-15"));
            req.setStartHour(9);
            req.setEndHour(18);

            CoordinationResDTO result = service.create(USER_ID, GROUP_ID, req);

            assertThat(result.getTitle()).isEqualTo("조율");
            assertThat(result.getDescription()).isEqualTo("가능한 시간을 남겨주세요");
            assertThat(result.getStatus()).isEqualTo("active");
            then(notificationService).should()
                    .createGroupNotification(eq("user-2"), eq("새 시간 조율이 시작되었습니다"), contains("조율에 참여해 주세요"));
            then(notificationService).should(never())
                    .createGroupNotification(eq(USER_ID), anyString(), anyString());
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

        @Test
        @DisplayName("날짜나 시간 범위가 올바르지 않으면 생성하지 않는다")
        void shouldThrowWhenRequestInvalid() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));

            CoordinationCreateReqDTO req = new CoordinationCreateReqDTO();
            req.setTitle("조율");
            req.setMode("once");
            req.setDates(List.of());
            req.setStartHour(18);
            req.setEndHour(9);

            assertThatThrownBy(() -> service.create(USER_ID, GROUP_ID, req))
                    .isInstanceOf(CoordinationException.class);
            then(repository).should(never()).saveCoordination(any());
        }
    }

    @Nested
    @DisplayName("getByGroupIdPaged")
    class GetByGroupIdPaged {

        @Test
        @DisplayName("목록 조회는 각 조율의 응답 수를 함께 반환한다")
        void shouldReturnResponseCount() {
            Coordination coordination = createCoordination(USER_ID);
            coordination.setResponseCount(null);

            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findByGroupIdPaged(GROUP_ID, 20, null))
                    .willReturn(CursorPageResult.<Coordination>builder()
                            .items(List.of(coordination))
                            .build());
            given(repository.findResponses(COORD_ID)).willReturn(List.of(
                    CoordinationResponse.builder().userId("user-1").date("2025-03-15").hour(10).build(),
                    CoordinationResponse.builder().userId("user-2").date("2025-03-15").hour(11).build()
            ));

            CursorPageResult<CoordinationResDTO> result = service.getByGroupIdPaged(USER_ID, GROUP_ID, "active", 20, null);

            assertThat(result.getItems()).hasSize(1);
            assertThat(result.getItems().get(0).getResponseCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("목록 조회는 저장된 responseCount가 있으면 응답 전체를 다시 읽지 않는다")
        void shouldUseStoredResponseCount() {
            Coordination coordination = createCoordination(USER_ID);
            coordination.setResponseCount(5);

            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findByGroupIdPaged(GROUP_ID, 20, null))
                    .willReturn(CursorPageResult.<Coordination>builder()
                            .items(List.of(coordination))
                            .build());

            CursorPageResult<CoordinationResDTO> result = service.getByGroupIdPaged(USER_ID, GROUP_ID, "active", 20, null);

            assertThat(result.getItems()).hasSize(1);
            assertThat(result.getItems().get(0).getResponseCount()).isEqualTo(5);
            then(repository).should(never()).findResponses(COORD_ID);
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
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination(USER_ID)));
            given(groupRepository.findMembersByGroupId(GROUP_ID))
                    .willReturn(List.of(mockMember(USER_ID), mockMember("user-2")));

            CoordinationUpdateReqDTO req = new CoordinationUpdateReqDTO();
            req.setStatus("closed");

            CoordinationResDTO result = service.update(USER_ID, GROUP_ID, COORD_ID, req);

            assertThat(result.getStatus()).isEqualTo("closed");
            then(notificationService).should()
                    .createGroupNotification(eq("user-2"), eq("시간 조율이 마감되었습니다"), contains("조율이 마감되었습니다"));
            then(notificationService).should(never())
                    .createGroupNotification(eq(USER_ID), anyString(), anyString());
        }

        @Test
        @DisplayName("생성자가 아니면 예외를 던진다")
        void shouldThrowWhenNotCreator() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("other-user")));

            assertThatThrownBy(() -> service.update(USER_ID, GROUP_ID, COORD_ID, new CoordinationUpdateReqDTO()))
                    .isInstanceOf(CoordinationException.class);
        }

        @Test
        @DisplayName("허용되지 않은 상태값은 저장하지 않는다")
        void shouldThrowWhenStatusInvalid() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination(USER_ID)));

            CoordinationUpdateReqDTO req = new CoordinationUpdateReqDTO();
            req.setStatus("paused");

            assertThatThrownBy(() -> service.update(USER_ID, GROUP_ID, COORD_ID, req))
                    .isInstanceOf(CoordinationException.class);
            then(repository).should(never()).saveCoordination(any());
        }
    }

    @Nested
    @DisplayName("submitResponses")
    class SubmitResponses {

        @Test
        @DisplayName("기존 응답을 삭제하고 새 응답을 저장한다")
        void shouldReplaceResponses() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("creator")));

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
            then(repository).should().updateResponseCount(GROUP_ID, COORD_ID, 1);
            then(notificationService).should()
                    .createGroupNotification(eq("creator"), eq("조율 응답이 등록되었습니다"), contains("새 응답이 등록되었습니다"));
        }

        @Test
        @DisplayName("응답 슬롯은 조율 날짜와 시간 범위 안에서만 저장한다")
        void shouldRejectOutOfRangeSlotsBeforeDeletingExistingResponses() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("creator")));

            CoordinationSubmitReqDTO req = new CoordinationSubmitReqDTO();
            req.setSlots(List.of(new SlotEntryDTO("2025-03-16", 10)));

            assertThatThrownBy(() -> service.submitResponses(USER_ID, GROUP_ID, COORD_ID, req))
                    .isInstanceOf(CoordinationException.class);
            then(repository).should(never()).findUserResponses(anyString(), anyString());
            then(repository).should(never()).deleteResponse(anyString(), anyString());
            then(repository).should(never()).saveResponse(any());
        }

        @Test
        @DisplayName("중복 응답 슬롯은 한 번만 저장한다")
        void shouldDeduplicateSlots() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("creator")));
            given(repository.findUserResponses(COORD_ID, USER_ID)).willReturn(List.of());

            CoordinationSubmitReqDTO req = new CoordinationSubmitReqDTO();
            req.setSlots(List.of(
                    new SlotEntryDTO("2025-03-15", 10),
                    new SlotEntryDTO("2025-03-15", 10)
            ));

            SubmitResultDTO result = service.submitResponses(USER_ID, GROUP_ID, COORD_ID, req);

            assertThat(result.getSubmittedCount()).isEqualTo(1);
            then(repository).should(times(1)).saveResponse(any());
            then(repository).should().updateResponseCount(GROUP_ID, COORD_ID, 1);
        }

        @Test
        @DisplayName("닫힌 조율에는 응답을 제출할 수 없다")
        void shouldRejectClosedCoordination() {
            Coordination closed = createCoordination("creator");
            closed.setStatus("closed");
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID)).willReturn(Optional.of(closed));

            CoordinationSubmitReqDTO req = new CoordinationSubmitReqDTO();
            req.setSlots(List.of(new SlotEntryDTO("2025-03-15", 10)));

            assertThatThrownBy(() -> service.submitResponses(USER_ID, GROUP_ID, COORD_ID, req))
                    .isInstanceOf(CoordinationException.class);
            then(repository).should(never()).findUserResponses(anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("생성자가 조율을 삭제하면 작성자를 제외한 그룹 멤버에게 알림을 보낸다")
        void shouldNotifyMembersWhenCreatorDeletes() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination(USER_ID)));
            given(groupRepository.findMembersByGroupId(GROUP_ID))
                    .willReturn(List.of(mockMember(USER_ID), mockMember("user-2")));

            service.delete(USER_ID, GROUP_ID, COORD_ID);

            then(repository).should().deleteCoordination(GROUP_ID, COORD_ID);
            then(notificationService).should()
                    .createGroupNotification(eq("user-2"), eq("시간 조율이 삭제되었습니다"), contains("조율이 삭제되었습니다"));
            then(notificationService).should(never())
                    .createGroupNotification(eq(USER_ID), anyString(), anyString());
        }

        @Test
        @DisplayName("생성자가 아니면 삭제 시 예외를 던진다")
        void shouldThrowWhenNotCreator() {
            given(groupRepository.findMember(GROUP_ID, USER_ID)).willReturn(Optional.of(mockMember()));
            given(repository.findCoordination(GROUP_ID, COORD_ID))
                    .willReturn(Optional.of(createCoordination("other")));

            assertThatThrownBy(() -> service.delete(USER_ID, GROUP_ID, COORD_ID))
                    .isInstanceOf(CoordinationException.class);
        }
    }
}
