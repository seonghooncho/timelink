package com.planner.domain.share;

import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.repository.CoordinationRepository;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupInvite;
import com.planner.domain.group.repository.GroupRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShareInviteControllerTest {

    @Mock private GroupRepository groupRepository;
    @Mock private CoordinationRepository coordinationRepository;

    @Test
    @DisplayName("시간 조율 공유 링크는 모임명과 조율 제목을 OG HTML에 포함한다")
    void invite_withActiveCoordination_returnsCoordinationPreview() {
        ShareInviteController controller = new ShareInviteController(groupRepository, coordinationRepository);
        GroupInvite invite = GroupInvite.builder().inviteCode("ABC123").groupId("group-1").build();
        Group group = Group.builder().id("group-1").name("주말 약속방").build();
        Coordination coordination = Coordination.builder()
                .id("coord-1")
                .groupId("group-1")
                .title("이번 주 가능 시간")
                .status("active")
                .build();

        when(groupRepository.findInvite("ABC123")).thenReturn(Optional.of(invite));
        when(groupRepository.findGroupById("group-1")).thenReturn(Optional.of(group));
        when(coordinationRepository.findCoordination("group-1", "coord-1")).thenReturn(Optional.of(coordination));

        ResponseEntity<String> response = controller.invite("ABC123", "coord-1");

        assertThat(response.getBody())
                .contains("주말 약속방 시간 조율 | Timelink")
                .contains("이번 주 가능 시간의 가능한 시간을 선택해주세요.")
                .contains("https://timelink.cloud/og/timelink-coordination.png")
                .contains("/groups/join/ABC123?coord=coord-1");
    }

    @Test
    @DisplayName("초대 코드가 유효하지 않으면 개인정보 없는 기본 미리보기를 반환한다")
    void invite_withInvalidInvite_returnsDefaultPreview() {
        ShareInviteController controller = new ShareInviteController(groupRepository, coordinationRepository);
        when(groupRepository.findInvite("BAD")).thenReturn(Optional.empty());

        ResponseEntity<String> response = controller.invite("BAD", null);

        assertThat(response.getBody())
                .contains("Timelink | 일정과 모임 시간을 한 곳에서")
                .contains("https://timelink.cloud/og/timelink-default.png")
                .contains("window.location.replace(\"/groups\")");
    }
}
