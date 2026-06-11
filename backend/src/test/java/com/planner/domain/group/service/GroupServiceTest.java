package com.planner.domain.group.service;

import com.planner.domain.group.dto.GroupCreateReqDTO;
import com.planner.domain.group.dto.GroupMemberResDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupUpdateReqDTO;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.notification.service.NotificationService;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import org.junit.jupiter.api.BeforeEach;
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
class GroupServiceTest {

    @Mock private GroupRepository repository;
    @Mock private ProfileRepository profileRepository;
    @Mock private NotificationService notificationService;
    @Mock private CursorCodec cursorCodec;
    @InjectMocks private GroupService service;

    @BeforeEach
    void setUp() {
        lenient().when(profileRepository.findByUserId(anyString())).thenReturn(Optional.empty());
        lenient().when(profileRepository.findByUserIds(anyCollection())).thenReturn(Map.of());
    }

    private Group sampleGroup(String groupId, String createdBy) {
        return Group.builder()
                .pk("GROUP#" + groupId).sk("METADATA")
                .id(groupId).name("Study").createdBy(createdBy)
                .inviteCode("ABC123").createdAt("2025-01-01T00:00:00Z")
                .build();
    }

    private GroupMember sampleMember(String groupId, String userId, String role) {
        return GroupMember.builder()
                .pk("GROUP#" + groupId).sk("MEMBER#" + userId)
                .id("m1").groupId(groupId).userId(userId).role(role)
                .gsi2pk("USER#" + userId).gsi2sk("GROUP#" + groupId)
                .joinedAt("2025-01-01T00:00:00Z")
                .build();
    }

    @Test
    @DisplayName("create — 그룹 생성 시 매니저 멤버 자동 등록")
    void create_addsManagerMember() {
        GroupCreateReqDTO req = new GroupCreateReqDTO();
        req.setName("Study");
        when(profileRepository.findByUserId("user1")).thenReturn(Optional.of(
                Profile.builder().id("USER#user1").sk("PROFILE").nickname("스터디장").avatarUrl("https://img/profile.png").build()
        ));

        assertThatCode(() -> service.create("user1", req)).doesNotThrowAnyException();
        verify(repository).saveGroup(any(Group.class));
        verify(repository).saveMember(argThat(m ->
                "manager".equals(m.getRole())
                        && "스터디장".equals(m.getNickname())
                        && "https://img/profile.png".equals(m.getAvatarUrl())
        ));
    }

    @Test
    @DisplayName("getMyGroups — 사용자 그룹 목록 조회")
    void getMyGroups_returnsList() {
        GroupMember member = sampleMember("g1", "user1", "member");
        when(repository.findGroupsByUserId("user1")).thenReturn(List.of(member));
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));

        List<GroupResDTO> result = service.getMyGroups("user1");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Study");
    }

    @Test
    @DisplayName("getMyGroupsPaged — 기본 20개 단위로 사용자 그룹을 조회한다")
    void getMyGroupsPaged_returnsPage() {
        GroupMember member = sampleMember("g1", "user1", "member");
        when(repository.findGroupsByUserIdPaged("user1", 20, null))
                .thenReturn(CursorPageResult.<GroupMember>builder().items(List.of(member)).build());
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));

        CursorPageResult<GroupResDTO> result = service.getMyGroupsPaged("user1", 20, null);

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getName()).isEqualTo("Study");
        verify(repository).findGroupsByUserIdPaged("user1", 20, null);
    }

    @Test
    @DisplayName("getDetail — 멤버가 아니면 예외")
    void getDetail_notMember_throws() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDetail("user1", "g1"))
                .isInstanceOf(GroupException.class);
    }

    @Test
    @DisplayName("update — 그룹 멤버라면 정보 수정 가능")
    void update_memberCanUpdate() {
        Group group = sampleGroup("g1", "other");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));
        when(repository.findMembersByGroupId("g1")).thenReturn(List.of(sampleMember("g1", "user1", "member")));

        GroupUpdateReqDTO req = new GroupUpdateReqDTO();
        req.setName("Updated");
        req.setDescription("New description");

        service.update("user1", "g1", req);

        verify(repository).saveGroup(argThat(saved ->
                "Updated".equals(saved.getName())
                        && "New description".equals(saved.getDescription())
        ));
    }

    @Test
    @DisplayName("update — 그룹 멤버가 아니면 예외")
    void update_notMember_throws() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());

        GroupUpdateReqDTO req = new GroupUpdateReqDTO();
        req.setName("Updated");

        assertThatThrownBy(() -> service.update("user1", "g1", req))
                .isInstanceOf(GroupException.class);
    }

    @Test
    @DisplayName("delete — 멤버 데이터도 함께 삭제")
    void delete_cleansUpMembers() {
        Group group = sampleGroup("g1", "user1");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "user1", "manager"), sampleMember("g1", "user2", "member")));

        service.delete("user1", "g1");

        verify(repository, times(2)).deleteMember(eq("g1"), anyString());
        verify(repository).deleteGroup("g1");
    }

    @Test
    @DisplayName("join — 초대코드로 그룹 가입")
    void join_success() {
        Group group = sampleGroup("g1", "other");
        when(repository.findByInviteCode("ABC123")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(sampleMember("g1", "user1", "member")));
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "other", "manager"), sampleMember("g1", "user1", "member"))
        );
        when(profileRepository.findByUserId("user1")).thenReturn(Optional.of(
                Profile.builder().id("USER#user1").sk("PROFILE").nickname("테스터").avatarUrl("https://img/join.png").build()
        ));

        assertThatCode(() -> service.join("user1", "ABC123")).doesNotThrowAnyException();
        verify(repository).saveMember(argThat(m ->
                "member".equals(m.getRole())
                        && "테스터".equals(m.getNickname())
                        && "https://img/join.png".equals(m.getAvatarUrl())
        ));
        verify(notificationService).createGroupNotificationIfEnabled(
                eq("other"),
                eq("새 멤버가 참여했습니다"),
                contains("테스터님이 들어왔습니다")
        );
        verify(notificationService, never()).createGroupNotificationIfEnabled(eq("user1"), anyString(), anyString());
    }

    @Test
    @DisplayName("join — 이미 멤버여도 상세 정보를 반환한다")
    void join_alreadyMember_returnsDetail() {
        Group group = sampleGroup("g1", "other");
        GroupMember member = sampleMember("g1", "user1", "member");
        when(repository.findByInviteCode("ABC123")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(member));
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMembersByGroupId("g1")).thenReturn(List.of(member));

        assertThatCode(() -> service.join("user1", "ABC123")).doesNotThrowAnyException();
        verify(repository, never()).saveMember(any());
    }

    @Test
    @DisplayName("getMembers — 멤버 목록 반환")
    void getMembers_returnsList() {
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "user1", "member")));
        when(profileRepository.findByUserIds(anyCollection())).thenReturn(Map.of(
                "user1",
                Profile.builder().id("USER#user1").sk("PROFILE").nickname("닉네임").avatarUrl("https://img/member.png").build()
        ));

        List<GroupMemberResDTO> result = service.getMembers("user1", "g1");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNickname()).isEqualTo("닉네임");
        assertThat(result.get(0).getAvatarUrl()).isEqualTo("https://img/member.png");
    }

    @Test
    @DisplayName("getMembers — group_member 닉네임보다 프로필 닉네임을 우선한다")
    void getMembers_prefersProfileDisplayFields() {
        GroupMember staleMember = sampleMember("g1", "user1", "member");
        staleMember.setNickname("예전그룹닉");
        staleMember.setAvatarUrl("https://img/old.png");
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(staleMember));
        when(repository.findMembersByGroupId("g1")).thenReturn(List.of(staleMember));
        when(profileRepository.findByUserIds(anyCollection())).thenReturn(Map.of(
                "user1",
                Profile.builder().id("USER#user1").sk("PROFILE").nickname("변경된닉네임").avatarUrl("https://img/new.png").build()
        ));

        List<GroupMemberResDTO> result = service.getMembers("user1", "g1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNickname()).isEqualTo("변경된닉네임");
        assertThat(result.get(0).getAvatarUrl()).isEqualTo("https://img/new.png");
        verify(profileRepository).findByUserIds(argThat(userIds -> userIds.contains("user1")));
        verify(profileRepository, never()).findByUserId("user1");
    }

    @Test
    @DisplayName("leave — 그룹 탈퇴")
    void leave_deleteMember() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));

        service.leave("user1", "g1");
        verify(repository).deleteMember("g1", "user1");
    }

    @Test
    @DisplayName("removeMember — 관리자가 다른 멤버를 내보낸다")
    void removeMember_managerRemovesMember() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "user1")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "manager")));
        when(repository.findMember("g1", "user2")).thenReturn(Optional.of(sampleMember("g1", "user2", "member")));

        service.removeMember("user1", "g1", "user2");

        verify(repository).deleteMember("g1", "user2");
    }

    @Test
    @DisplayName("removeMember — 일반 멤버는 내보낼 수 없다")
    void removeMember_memberThrows() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "user1")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));

        assertThatThrownBy(() -> service.removeMember("user1", "g1", "user2"))
                .isInstanceOf(GroupException.class);
        verify(repository, never()).deleteMember(anyString(), anyString());
    }

    @Test
    @DisplayName("removeMember — 자기 자신은 멤버 관리에서 내보낼 수 없다")
    void removeMember_selfThrows() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "user1")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "manager")));

        assertThatThrownBy(() -> service.removeMember("user1", "g1", "user1"))
                .isInstanceOf(GroupException.class);
        verify(repository, never()).deleteMember(anyString(), anyString());
    }
}
