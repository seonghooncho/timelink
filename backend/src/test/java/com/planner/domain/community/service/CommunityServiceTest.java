package com.planner.domain.community.service;

import com.planner.domain.community.dto.CommunityCommentCreateReqDTO;
import com.planner.domain.community.dto.CommunityCommentResDTO;
import com.planner.domain.community.dto.CommunityPostCreateReqDTO;
import com.planner.domain.community.dto.CommunityPostResDTO;
import com.planner.domain.community.dto.CommunityPostUpdateReqDTO;
import com.planner.domain.community.error.CommunityException;
import com.planner.domain.community.model.CommunityComment;
import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.community.repository.CommunityRepository;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.domain.storage.model.ImagePurpose;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.model.ImageUpload;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

    @Mock private CommunityRepository repository;
    @Mock private ProfileRepository profileRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private CursorCodec cursorCodec;
    @Mock private StorageService storageService;
    @InjectMocks private CommunityService service;

    @BeforeEach
    void setUp() {
        lenient().when(profileRepository.findByUserId("user1")).thenReturn(Optional.of(
                Profile.builder()
                        .id("USER#user1")
                        .sk("PROFILE")
                        .nickname("민지")
                        .avatarUrl("https://img/profile.png")
                        .build()
        ));
        lenient().when(repository.isLikedBy(anyString(), anyString())).thenReturn(false);
        lenient().when(groupRepository.findGroupById("group1")).thenReturn(Optional.of(
                Group.builder().pk("GROUP#group1").sk("METADATA").id("group1").name("스터디").build()
        ));
        lenient().when(groupRepository.findMember("group1", "user1")).thenReturn(Optional.of(
                GroupMember.builder().pk("GROUP#group1").sk("MEMBER#user1").groupId("group1").userId("user1").build()
        ));
    }

    private CommunityPost post(String authorUserId) {
        return CommunityPost.builder()
                .pk("POST#p1")
                .sk("METADATA")
                .id("p1")
                .title("제목")
                .content("본문")
                .authorUserId(authorUserId)
                .authorNickname("민지")
                .likeCount(1)
                .commentCount(2)
                .createdAt("2026-06-13T00:00:00Z")
                .updatedAt("2026-06-13T00:00:00Z")
                .build();
    }

    private CommunityPost groupPost(String authorUserId) {
        CommunityPost post = post(authorUserId);
        post.setGroupId("group1");
        post.setGsi6pk("GROUP#group1#POSTS");
        post.setGsi6sk("CREATED_AT#2026-06-13T00:00:00Z#POST#p1");
        return post;
    }

    private CommunityComment comment(String authorUserId) {
        return CommunityComment.builder()
                .pk("POST#p1")
                .sk("COMMENT#2026-06-13T00:00:00Z#c1")
                .id("c1")
                .postId("p1")
                .content("댓글")
                .authorUserId(authorUserId)
                .authorNickname("민지")
                .createdAt("2026-06-13T00:00:00Z")
                .updatedAt("2026-06-13T00:00:00Z")
                .build();
    }

    @Test
    @DisplayName("createPost — 프로필 스냅샷과 최신순 GSI를 저장한다")
    void createPost_savesSnapshotAndIndex() {
        CommunityPostCreateReqDTO req = new CommunityPostCreateReqDTO();
        req.setTitle("  약속 잡는 팁  ");
        req.setContent("  후보 시간을 좁혀보세요.  ");

        CommunityPostResDTO result = service.createPost("user1", req);

        ArgumentCaptor<CommunityPost> captor = ArgumentCaptor.forClass(CommunityPost.class);
        verify(repository).savePost(captor.capture());
        CommunityPost saved = captor.getValue();
        assertThat(result.getTitle()).isEqualTo("약속 잡는 팁");
        assertThat(saved.getAuthorNickname()).isEqualTo("민지");
        assertThat(saved.getAuthorAvatarUrl()).isEqualTo("https://img/profile.png");
        assertThat(saved.getGsi5pk()).isEqualTo("COMMUNITY#POSTS");
        assertThat(saved.getGsi5sk()).contains(saved.getId());
    }

    @Test
    @DisplayName("createPost — 익명 글은 권한용 작성자는 저장하고 응답에서는 작성자를 숨긴다")
    void createPost_anonymousHidesAuthorInResponse() {
        CommunityPostCreateReqDTO req = new CommunityPostCreateReqDTO();
        req.setTitle("  익명 질문  ");
        req.setContent("  일정 조율 팁이 궁금합니다.  ");
        req.setAnonymous(true);

        CommunityPostResDTO result = service.createPost("user1", req);

        ArgumentCaptor<CommunityPost> captor = ArgumentCaptor.forClass(CommunityPost.class);
        verify(repository).savePost(captor.capture());
        assertThat(captor.getValue().getAuthorUserId()).isEqualTo("user1");
        assertThat(captor.getValue().getAnonymous()).isTrue();
        assertThat(result.getAuthorUserId()).isNull();
        assertThat(result.getAuthorNickname()).isEqualTo("익명");
        assertThat(result.getMine()).isTrue();
    }

    @Test
    @DisplayName("getPosts — 좋아요 여부와 작성자 여부를 포함한다")
    void getPosts_includesLikedAndMine() {
        when(repository.findPostsPaged(20, null))
                .thenReturn(CursorPageResult.<CommunityPost>builder().items(List.of(post("user1"))).build());
        when(repository.isLikedBy("p1", "user1")).thenReturn(true);

        CursorPageResult<CommunityPostResDTO> result = service.getPosts("user1", 20, null);

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getLikedByMe()).isTrue();
        assertThat(result.getItems().get(0).getMine()).isTrue();
    }

    @Test
    @DisplayName("getPosts — 댓글이 있으면 최신 댓글 preview를 포함한다")
    void getPosts_includesLatestCommentPreview() {
        when(repository.findPostsPaged(20, null))
                .thenReturn(CursorPageResult.<CommunityPost>builder().items(List.of(post("other"))).build());
        when(repository.findLatestCommentByPostId("p1")).thenReturn(Optional.of(comment("user1")));

        CursorPageResult<CommunityPostResDTO> result = service.getPosts("user1", 20, null);

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getPreviewComment()).isNotNull();
        assertThat(result.getItems().get(0).getPreviewComment().getContent()).isEqualTo("댓글");
    }

    @Test
    @DisplayName("resolveLimit — 목록 조회 개수를 1~100 범위로 보정한다")
    void resolveLimit_clampsBoundaries() {
        assertThat(service.resolveLimit(null)).isEqualTo(20);
        assertThat(service.resolveLimit(0)).isEqualTo(20);
        assertThat(service.resolveLimit(1)).isEqualTo(1);
        assertThat(service.resolveLimit(200)).isEqualTo(100);
    }

    @Test
    @DisplayName("createGroupPost — 그룹 멤버만 그룹 게시물 인덱스로 저장한다")
    void createGroupPost_savesGroupIndex() {
        CommunityPostCreateReqDTO req = new CommunityPostCreateReqDTO();
        req.setTitle(" 모임 공지 ");
        req.setContent(" 내일 7시에 만나요 ");

        CommunityPostResDTO result = service.createGroupPost("user1", "group1", req);

        ArgumentCaptor<CommunityPost> captor = ArgumentCaptor.forClass(CommunityPost.class);
        verify(repository).savePost(captor.capture());
        CommunityPost saved = captor.getValue();
        assertThat(result.getGroupId()).isEqualTo("group1");
        assertThat(saved.getGsi5pk()).isNull();
        assertThat(saved.getGsi6pk()).isEqualTo("GROUP#group1#POSTS");
        assertThat(saved.getGsi6sk()).contains(saved.getId());
    }

    @Test
    @DisplayName("getPost — 그룹 게시물은 그룹 멤버가 아니면 예외")
    void getPost_groupPostRequiresMembership() {
        when(repository.findPost("p1")).thenReturn(Optional.of(groupPost("other")));
        when(groupRepository.findMember("group1", "outsider")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getPost("outsider", "p1"))
                .isInstanceOf(GroupException.class);
    }

    @Test
    @DisplayName("createGroupComment — 그룹 게시물 댓글은 멤버만 작성한다")
    void createGroupComment_requiresMembershipAndIncrementsCount() {
        when(repository.findPost("p1")).thenReturn(Optional.of(groupPost("other")));
        CommunityCommentCreateReqDTO req = new CommunityCommentCreateReqDTO();
        req.setContent(" 확인했습니다 ");

        CommunityCommentResDTO result = service.createGroupComment("user1", "group1", "p1", req);

        verify(repository).saveComment(any(CommunityComment.class));
        verify(repository).incrementCommentCount("p1");
        assertThat(result.getContent()).isEqualTo("확인했습니다");
    }

    @Test
    @DisplayName("updatePost — 작성자가 아니면 예외")
    void updatePost_notAuthor_throws() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("other")));
        CommunityPostUpdateReqDTO req = new CommunityPostUpdateReqDTO();
        req.setTitle("수정");

        assertThatThrownBy(() -> service.updatePost("user1", "p1", req))
                .isInstanceOf(CommunityException.class);
    }

    @Test
    @DisplayName("updateGroupPost — 모임 글 이미지를 연결한다")
    void updateGroupPost_attachesImage() {
        when(repository.findPost("p1")).thenReturn(Optional.of(groupPost("user1")));
        when(storageService.attachImageToTarget("user1", "img1", ImagePurpose.GROUP_POST, "p1"))
                .thenReturn(ImageUpload.builder()
                        .imageId("img1")
                        .status(ImageStatus.PROCESSING.name())
                        .uploadKey("upload/group-post/user1/img1/original.webp")
                        .build());

        CommunityPostUpdateReqDTO req = new CommunityPostUpdateReqDTO();
        req.setImageId("img1");

        CommunityPostResDTO result = service.updateGroupPost("user1", "group1", "p1", req);

        ArgumentCaptor<CommunityPost> captor = ArgumentCaptor.forClass(CommunityPost.class);
        verify(repository).savePost(captor.capture());
        assertThat(result.getImageId()).isEqualTo("img1");
        assertThat(captor.getValue().getImageStatus()).isEqualTo("PROCESSING");
    }

    @Test
    @DisplayName("updatePost — 커뮤니티 글 이미지는 COMMUNITY_POST 목적으로 연결한다")
    void updatePost_attachesCommunityImage() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("user1")));
        when(storageService.attachImageToTarget("user1", "img1", ImagePurpose.COMMUNITY_POST, "p1"))
                .thenReturn(ImageUpload.builder()
                        .imageId("img1")
                        .status(ImageStatus.PROCESSING.name())
                        .uploadKey("upload/community-post/user1/img1/original.webp")
                        .build());

        CommunityPostUpdateReqDTO req = new CommunityPostUpdateReqDTO();
        req.setImageId("img1");

        CommunityPostResDTO result = service.updatePost("user1", "p1", req);

        assertThat(result.getImageId()).isEqualTo("img1");
        verify(storageService).attachImageToTarget("user1", "img1", ImagePurpose.COMMUNITY_POST, "p1");
    }

    @Test
    @DisplayName("getPublicProfile — 공개 모임과 익명이 아닌 커뮤니티 활동만 반환한다")
    void getPublicProfile_returnsPublicGroupsAndNonAnonymousActivities() {
        Group publicGroup = Group.builder()
                .pk("GROUP#public1")
                .sk("METADATA")
                .id("public1")
                .name("공개 러닝")
                .visibility("PUBLIC")
                .memberCount(3)
                .build();
        Group privateGroup = Group.builder()
                .pk("GROUP#private1")
                .sk("METADATA")
                .id("private1")
                .name("비공개 스터디")
                .visibility("PRIVATE")
                .memberCount(2)
                .build();
        CommunityPost visiblePost = post("target");
        visiblePost.setTitle("공개 활동");
        CommunityPost anonymousPost = post("target");
        anonymousPost.setId("p2");
        anonymousPost.setAnonymous(true);
        when(profileRepository.findByUserId("target")).thenReturn(Optional.of(
                Profile.builder().id("USER#target").sk("PROFILE").nickname("지훈").avatarUrl("https://img/jihun.png").build()
        ));
        when(groupRepository.findGroupsByUserId("target")).thenReturn(List.of(
                GroupMember.builder().groupId("public1").userId("target").build(),
                GroupMember.builder().groupId("private1").userId("target").build()
        ));
        when(groupRepository.findGroupsByIds(List.of("public1", "private1"))).thenReturn(Map.of(
                "public1", publicGroup,
                "private1", privateGroup
        ));
        when(groupRepository.findMember("public1", "user1")).thenReturn(Optional.empty());
        when(groupRepository.findJoinRequest("public1", "user1")).thenReturn(Optional.empty());
        when(repository.findPostsPaged(50, null))
                .thenReturn(CursorPageResult.<CommunityPost>builder().items(List.of(visiblePost, anonymousPost)).build());

        var result = service.getPublicProfile("user1", "target");

        assertThat(result.getNickname()).isEqualTo("지훈");
        assertThat(result.getPublicGroups()).hasSize(1);
        assertThat(result.getPublicGroups().get(0).getName()).isEqualTo("공개 러닝");
        assertThat(result.getRecentActivities()).hasSize(1);
        assertThat(result.getRecentActivities().get(0).getTitle()).isEqualTo("공개 활동");
    }

    @Test
    @DisplayName("likePost — 게시물 존재 확인 후 좋아요를 저장한다")
    void likePost_savesLike() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("other")));

        CommunityPostResDTO result = service.likePost("user1", "p1");

        verify(repository).likePost("p1", "user1");
        assertThat(result.getId()).isEqualTo("p1");
    }

    @Test
    @DisplayName("createComment — 댓글 저장 후 댓글 수를 증가시킨다")
    void createComment_incrementsCount() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("other")));
        CommunityCommentCreateReqDTO req = new CommunityCommentCreateReqDTO();
        req.setContent(" 참여하고 싶어요 ");

        CommunityCommentResDTO result = service.createComment("user1", "p1", req);

        verify(repository).saveComment(any(CommunityComment.class));
        verify(repository).incrementCommentCount("p1");
        assertThat(result.getContent()).isEqualTo("참여하고 싶어요");
    }

    @Test
    @DisplayName("deleteComment — 작성자 댓글만 삭제하고 댓글 수를 감소시킨다")
    void deleteComment_authorOnly() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("other")));
        when(repository.findComment("p1", "c1")).thenReturn(Optional.of(comment("user1")));
        when(repository.deleteComment(any(CommunityComment.class))).thenReturn(true);

        service.deleteComment("user1", "p1", "c1");

        verify(repository).decrementCommentCount("p1");
    }

    @Test
    @DisplayName("deleteComment — 작성자가 아니면 예외")
    void deleteComment_notAuthor_throws() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("other")));
        when(repository.findComment("p1", "c1")).thenReturn(Optional.of(comment("other")));

        assertThatThrownBy(() -> service.deleteComment("user1", "p1", "c1"))
                .isInstanceOf(CommunityException.class);
    }
}
