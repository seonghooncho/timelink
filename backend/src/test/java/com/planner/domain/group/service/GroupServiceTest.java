package com.planner.domain.group.service;

import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.community.repository.CommunityRepository;
import com.planner.domain.group.dto.GroupCreateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestCreateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestDecisionReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestResDTO;
import com.planner.domain.group.dto.GroupIntroResDTO;
import com.planner.domain.group.dto.GroupMemberResDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupUpdateReqDTO;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupInvite;
import com.planner.domain.group.model.GroupIntro;
import com.planner.domain.group.model.GroupJoinRequest;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.notification.service.NotificationService;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.domain.schedule.model.Schedule;
import com.planner.domain.schedule.repository.ScheduleRepository;
import com.planner.domain.storage.repository.ImageUploadRepository;
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
    @Mock private ScheduleRepository scheduleRepository;
    @Mock private ImageUploadRepository imageUploadRepository;
    @Mock private CommunityRepository communityRepository;
    @InjectMocks private GroupService service;

    @BeforeEach
    void setUp() {
        lenient().when(profileRepository.findByUserId(anyString())).thenReturn(Optional.empty());
        lenient().when(profileRepository.findByUserIds(anyCollection())).thenReturn(Map.of());
        lenient().when(repository.saveInviteIfAbsent(any(GroupInvite.class))).thenReturn(true);
        lenient().when(scheduleRepository.findNextByGroupId(anyString(), anyString())).thenReturn(Optional.empty());
    }

    private Group sampleGroup(String groupId, String createdBy) {
        return Group.builder()
                .pk("GROUP#" + groupId).sk("METADATA")
                .id(groupId).name("Study").createdBy(createdBy)
                .inviteCode("ABC123").createdAt("2025-01-01T00:00:00Z")
                .memberCount(1)
                .build();
    }

    private Group samplePublicGroup(String groupId, String createdBy) {
        Group group = sampleGroup(groupId, createdBy);
        group.setVisibility("PUBLIC");
        group.setGsi3pk("GROUP#PUBLIC");
        group.setGsi3sk(group.getCreatedAt() + "#" + groupId);
        return group;
    }

    private GroupInvite sampleInvite(String groupId) {
        return GroupInvite.builder()
                .pk("INVITE#ABC123").sk("METADATA")
                .inviteCode("ABC123").groupId(groupId)
                .createdAt("2025-01-01T00:00:00Z")
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

    private GroupJoinRequest sampleJoinRequest(String groupId, String userId) {
        return GroupJoinRequest.builder()
                .pk("GROUP#" + groupId).sk("JOIN_REQUEST#" + userId)
                .id("jr1").groupId(groupId).userId(userId)
                .status("PENDING")
                .message("함께 참여하고 싶습니다")
                .nickname("요청자")
                .avatarUrl("https://img/requester.png")
                .createdAt("2025-01-02T00:00:00Z")
                .build();
    }

    private CommunityPost sampleGroupPost(String groupId) {
        return CommunityPost.builder()
                .pk("POST#p1")
                .sk("METADATA")
                .id("p1")
                .groupId(groupId)
                .title("지난주 후기")
                .content("처음 온 분들도 편하게 달렸습니다.")
                .authorNickname("민지")
                .createdAt("2026-06-13T00:00:00Z")
                .build();
    }

    private CommunityPost sampleMemberOnlyGroupPost(String groupId) {
        CommunityPost post = sampleGroupPost(groupId);
        post.setId("p-private");
        post.setTitle("멤버 공지");
        post.setMemberOnly(true);
        return post;
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
        verify(repository).saveInviteIfAbsent(any(GroupInvite.class));
        verify(repository).saveGroup(any(Group.class));
        verify(repository).saveMember(argThat(m ->
                "manager".equals(m.getRole())
                        && "스터디장".equals(m.getNickname())
                        && "https://img/profile.png".equals(m.getAvatarUrl())
        ));
    }

    @Test
    @DisplayName("create — 공개 모임은 공개 조회 GSI 키를 저장한다")
    void create_publicGroup_setsPublicIndex() {
        GroupCreateReqDTO req = new GroupCreateReqDTO();
        req.setName("Open Study");
        req.setVisibility("PUBLIC");

        service.create("user1", req);

        verify(repository).saveGroup(argThat(group ->
                "PUBLIC".equals(group.getVisibility())
                        && "GROUP#PUBLIC".equals(group.getGsi3pk())
                        && group.getGsi3sk() != null
                        && group.getGsi3sk().contains(group.getId())
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
        assertThat(result.get(0).getMemberCount()).isEqualTo(1);
        verify(repository, never()).findMembersByGroupId("g1");
    }

    @Test
    @DisplayName("getMyGroups — 다음 예정 모임 일정을 요약한다")
    void getMyGroups_returnsNextScheduleSummary() {
        GroupMember member = sampleMember("g1", "user1", "member");
        Schedule schedule = Schedule.builder()
                .id("s1")
                .title("주말 회고")
                .startTime("2026-06-20T10:00:00")
                .duration(1.0)
                .build();
        when(repository.findGroupsByUserId("user1")).thenReturn(List.of(member));
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "other")));
        when(scheduleRepository.findNextByGroupId(eq("g1"), anyString())).thenReturn(Optional.of(schedule));

        List<GroupResDTO> result = service.getMyGroups("user1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNextSchedule().getTitle()).isEqualTo("주말 회고");
    }

    @Test
    @DisplayName("getMyGroups — memberCount가 없는 기존 그룹은 멤버 수를 계산한다")
    void getMyGroups_fallsBackWhenMemberCountMissing() {
        GroupMember member = sampleMember("g1", "user1", "member");
        Group group = sampleGroup("g1", "other");
        group.setMemberCount(null);
        when(repository.findGroupsByUserId("user1")).thenReturn(List.of(member));
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "user1", "member"), sampleMember("g1", "other", "manager")));

        List<GroupResDTO> result = service.getMyGroups("user1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMemberCount()).isEqualTo(2);
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
    @DisplayName("getPublicGroupsPaged — 공개 모임과 내 가입요청 상태를 반환한다")
    void getPublicGroupsPaged_returnsJoinRequestStatus() {
        Group group = samplePublicGroup("g1", "manager");
        when(repository.findPublicGroupsPaged(20, null))
                .thenReturn(CursorPageResult.<Group>builder().items(List.of(group)).build());
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());
        when(repository.findJoinRequest("g1", "user1")).thenReturn(Optional.of(sampleJoinRequest("g1", "user1")));

        CursorPageResult<GroupResDTO> result = service.getPublicGroupsPaged("user1", 20, null);

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getVisibility()).isEqualTo("PUBLIC");
        assertThat(result.getItems().get(0).getJoinRequestStatus()).isEqualTo("PENDING");
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
    @DisplayName("getIntro — 공개 모임은 미가입자에게 소개와 글 미리보기를 반환한다")
    void getIntro_publicGroup_returnsPreviewForNonMember() {
        Group group = samplePublicGroup("g1", "manager");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());
        when(repository.findJoinRequest("g1", "user1")).thenReturn(Optional.of(sampleJoinRequest("g1", "user1")));
        when(repository.findIntro("g1")).thenReturn(Optional.of(GroupIntro.builder()
                .pk("GROUP#g1")
                .sk("INTRO")
                .groupId("g1")
                .introText("천천히 함께 달립니다.")
                .imageIds(List.of())
                .build()));
        when(repository.findNoticesByGroupId("g1", 5)).thenReturn(List.of());
        when(communityRepository.findGroupPostsPaged("g1", 5, null))
                .thenReturn(CursorPageResult.<CommunityPost>builder().items(List.of(sampleGroupPost("g1"))).build());

        GroupIntroResDTO result = service.getIntro("user1", "g1");

        assertThat(result.isMember()).isFalse();
        assertThat(result.getJoinRequestStatus()).isEqualTo("PENDING");
        assertThat(result.getIntroText()).isEqualTo("천천히 함께 달립니다.");
        assertThat(result.getPostPreviews()).hasSize(1);
        assertThat(result.getPostPreviews().get(0).getTitle()).isEqualTo("지난주 후기");
    }

    @Test
    @DisplayName("getIntro — 미가입자에게 멤버 전용 글 미리보기를 잠금 상태로 반환한다")
    void getIntro_publicGroup_returnsLockedMemberOnlyPreviewForNonMember() {
        Group group = samplePublicGroup("g1", "manager");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());
        when(repository.findIntro("g1")).thenReturn(Optional.empty());
        when(repository.findNoticesByGroupId("g1", 5)).thenReturn(List.of());
        when(communityRepository.findGroupPostsPaged("g1", 5, null)).thenReturn(CursorPageResult.<CommunityPost>builder()
                .items(List.of(sampleMemberOnlyGroupPost("g1"), sampleGroupPost("g1")))
                .build());

        GroupIntroResDTO result = service.getIntro("user1", "g1");

        assertThat(result.getPostPreviews()).hasSize(2);
        assertThat(result.getPostPreviews().get(0).getTitle()).isNull();
        assertThat(result.getPostPreviews().get(0).getContentSnippet()).isNull();
        assertThat(result.getPostPreviews().get(0).getMemberOnly()).isTrue();
        assertThat(result.getPostPreviews().get(0).getLocked()).isTrue();
        assertThat(result.getPostPreviews().get(1).getTitle()).isEqualTo("지난주 후기");
        assertThat(result.getPostPreviews().get(1).getLocked()).isFalse();
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
    @DisplayName("update — 그룹 정보 변경 시 수정자를 제외한 멤버에게 알림을 보낸다")
    void update_notifiesOtherMembers() {
        Group group = sampleGroup("g1", "other");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "member")));
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "user1", "member"), sampleMember("g1", "user2", "member")));

        GroupUpdateReqDTO req = new GroupUpdateReqDTO();
        req.setName("Updated");

        service.update("user1", "g1", req);

        verify(notificationService).createGroupNotification(
                eq("user2"),
                eq("그룹 정보가 변경되었습니다"),
                contains("Updated 그룹 정보가 변경되었습니다")
        );
        verify(notificationService, never()).createGroupNotification(eq("user1"), anyString(), anyString());
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
        verify(repository).deleteInvite("ABC123");
        verify(repository).deleteGroup("g1");
        verify(notificationService).createGroupNotification(
                eq("user2"),
                eq("그룹이 삭제되었습니다"),
                contains("Study 그룹이 삭제되었습니다")
        );
    }

    @Test
    @DisplayName("create — 초대코드가 충돌하면 재시도한다")
    void create_retriesInviteCodeCollision() {
        GroupCreateReqDTO req = new GroupCreateReqDTO();
        req.setName("Study");
        when(repository.saveInviteIfAbsent(any(GroupInvite.class)))
                .thenReturn(false)
                .thenReturn(true);

        assertThatCode(() -> service.create("user1", req)).doesNotThrowAnyException();

        verify(repository, times(2)).saveInviteIfAbsent(any(GroupInvite.class));
        verify(repository).saveGroup(any(Group.class));
    }

    @Test
    @DisplayName("join — 초대코드로 그룹 가입")
    void join_success() {
        Group group = sampleGroup("g1", "other");
        when(repository.findInvite("ABC123")).thenReturn(Optional.of(sampleInvite("g1")));
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
        verify(repository).updateMemberCount("g1", 1);
        verify(notificationService).createGroupNotification(
                eq("other"),
                eq("새 멤버가 참여했습니다"),
                contains("테스터님이 들어왔습니다")
        );
        verify(notificationService, never()).createGroupNotification(eq("user1"), anyString(), anyString());
    }

    @Test
    @DisplayName("join — 이미 멤버여도 상세 정보를 반환한다")
    void join_alreadyMember_returnsDetail() {
        Group group = sampleGroup("g1", "other");
        GroupMember member = sampleMember("g1", "user1", "member");
        when(repository.findInvite("ABC123")).thenReturn(Optional.of(sampleInvite("g1")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(member));
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMembersByGroupId("g1")).thenReturn(List.of(member));

        assertThatCode(() -> service.join("user1", "ABC123")).doesNotThrowAnyException();
        verify(repository, never()).saveMember(any());
        verify(repository, never()).updateMemberCount(anyString(), anyInt());
    }

    @Test
    @DisplayName("requestToJoin — 공개 모임 가입요청을 저장하고 관리자에게 알린다")
    void requestToJoin_savesPendingRequestAndNotifiesManagers() {
        Group group = samplePublicGroup("g1", "manager");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());
        when(repository.findJoinRequest("g1", "user1")).thenReturn(Optional.empty());
        when(repository.findMembersByGroupId("g1")).thenReturn(List.of(sampleMember("g1", "manager", "manager")));
        when(profileRepository.findByUserId("user1")).thenReturn(Optional.of(
                Profile.builder().id("USER#user1").sk("PROFILE").nickname("요청자").avatarUrl("https://img/requester.png").build()
        ));

        GroupJoinRequestCreateReqDTO req = new GroupJoinRequestCreateReqDTO();
        req.setMessage("함께 참여하고 싶습니다");

        GroupJoinRequestResDTO result = service.requestToJoin("user1", "g1", req);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(repository).saveJoinRequest(argThat(joinRequest ->
                "JOIN_REQUEST#user1".equals(joinRequest.getSk())
                        && "함께 참여하고 싶습니다".equals(joinRequest.getMessage())
                        && "요청자".equals(joinRequest.getNickname())
        ));
        verify(notificationService).createGroupNotification(
                eq("manager"),
                contains("가입을 요청했습니다"),
                eq("함께 참여하고 싶습니다"),
                eq("GROUP_JOIN_REQUEST"),
                eq("g1"),
                eq("/groups/g1?panel=joinRequests")
        );
    }

    @Test
    @DisplayName("requestToJoin — 비공개 모임에는 가입요청을 보낼 수 없다")
    void requestToJoin_privateGroupThrows() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "manager")));

        GroupJoinRequestCreateReqDTO req = new GroupJoinRequestCreateReqDTO();

        assertThatThrownBy(() -> service.requestToJoin("user1", "g1", req))
                .isInstanceOf(GroupException.class);
        verify(repository, never()).saveJoinRequest(any());
    }

    @Test
    @DisplayName("decideJoinRequest — 승인하면 멤버를 추가하고 요청자에게 알린다")
    void decideJoinRequest_approveAddsMember() {
        Group group = samplePublicGroup("g1", "manager");
        GroupJoinRequest joinRequest = sampleJoinRequest("g1", "user1");
        when(repository.findGroupById("g1")).thenReturn(Optional.of(group));
        when(repository.findMember("g1", "manager")).thenReturn(Optional.of(sampleMember("g1", "manager", "manager")));
        when(repository.findJoinRequest("g1", "user1")).thenReturn(Optional.of(joinRequest));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.empty());
        when(repository.findMembersByGroupId("g1")).thenReturn(
                List.of(sampleMember("g1", "manager", "manager"), sampleMember("g1", "user1", "member"))
        );

        GroupJoinRequestDecisionReqDTO req = new GroupJoinRequestDecisionReqDTO();
        req.setStatus("APPROVED");

        GroupJoinRequestResDTO result = service.decideJoinRequest("manager", "g1", "user1", req);

        assertThat(result.getStatus()).isEqualTo("APPROVED");
        verify(repository).saveMember(argThat(member -> "user1".equals(member.getUserId()) && "member".equals(member.getRole())));
        verify(repository).updateMemberCount("g1", 1);
        verify(repository).saveJoinRequest(argThat(saved -> "APPROVED".equals(saved.getStatus()) && saved.getDecidedAt() != null));
        verify(notificationService).createGroupNotification(
                eq("user1"),
                eq("모임 가입요청이 승인되었습니다"),
                contains("Study 모임"),
                eq("GROUP"),
                eq("g1"),
                eq("/groups/g1")
        );
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
        verify(repository).updateMemberCount("g1", -1);
    }

    @Test
    @DisplayName("removeMember — 관리자가 다른 멤버를 내보낸다")
    void removeMember_managerRemovesMember() {
        when(repository.findGroupById("g1")).thenReturn(Optional.of(sampleGroup("g1", "user1")));
        when(repository.findMember("g1", "user1")).thenReturn(Optional.of(sampleMember("g1", "user1", "manager")));
        when(repository.findMember("g1", "user2")).thenReturn(Optional.of(sampleMember("g1", "user2", "member")));

        service.removeMember("user1", "g1", "user2");

        verify(repository).deleteMember("g1", "user2");
        verify(repository).updateMemberCount("g1", -1);
        verify(notificationService).createGroupNotification(
                eq("user2"),
                eq("그룹에서 내보내졌습니다"),
                contains("Study 그룹에서 내보내졌습니다")
        );
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
