package com.planner.domain.group.service;

import com.planner.domain.group.dto.req.GroupCreateReqDTO;
import com.planner.domain.group.dto.req.GroupUpdateReqDTO;
import com.planner.domain.group.dto.res.GroupMemberResDTO;
import com.planner.domain.group.dto.res.GroupResDTO;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock private GroupRepository repository;
    @InjectMocks private GroupService service;

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
        when(repository.findGroupById(anyString()))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(sampleGroup("any", "user1")));
        when(repository.findMember(anyString(), eq("user1")))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(sampleMember("any", "user1", "manager")));
        when(repository.findMembersByGroupId(anyString())).thenReturn(List.of());

        GroupCreateReqDTO req = new GroupCreateReqDTO();
        req.setName("Study");

        assertThatCode(() -> service.create("user1", req)).doesNotThrowAnyException();
        verify(repository).saveGroup(any(Group.class));
        verify(repository).saveMember(argThat(m -> "manager".equals(m.getRole())));
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
    @DisplayName("getDetail — 멤버가 아니면 예외")
    void getDetail_notMember_throws() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDetail("user1", "g1"))
                .isInstanceOf(GroupException.class);
    }

    @Test
    @DisplayName("update — 매니저만 수정 가능")
    void update_notManager_throws() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));

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
        when(repository.findMembersByGroupId("g1")).thenReturn(List.of());

        assertThatCode(() -> service.join("user1", "ABC123")).doesNotThrowAnyException();
        verify(repository).saveMember(argThat(m -> "member".equals(m.getRole())));
    }

    @Test
    @DisplayName("join — 이미 멤버이면 예외")
    void join_alreadyMember_throws() {
        Group group = sampleGroup("g1", "other");
        when(repository.findByInviteCode("ABC123")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));

        assertThatThrownBy(() -> service.join("user1", "ABC123"))
                .isInstanceOf(GroupException.class);
    }

    @Test
    @DisplayName("getMembers — 멤버 목록 반환")
    void getMembers_returnsList() {
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "user1", "member")));

        List<GroupMemberResDTO> result = service.getMembers("user1", "g1");
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("leave — 그룹 탈퇴")
    void leave_deleteMember() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));

        service.leave("user1", "g1");
        verify(repository).deleteMember("g1", "user1");
    }
}
