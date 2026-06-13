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
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
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
    @Mock private CursorCodec cursorCodec;
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
    @DisplayName("updatePost — 작성자가 아니면 예외")
    void updatePost_notAuthor_throws() {
        when(repository.findPost("p1")).thenReturn(Optional.of(post("other")));
        CommunityPostUpdateReqDTO req = new CommunityPostUpdateReqDTO();
        req.setTitle("수정");

        assertThatThrownBy(() -> service.updatePost("user1", "p1", req))
                .isInstanceOf(CommunityException.class);
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
        when(repository.findComment("p1", "c1")).thenReturn(Optional.of(comment("user1")));
        when(repository.deleteComment(any(CommunityComment.class))).thenReturn(true);

        service.deleteComment("user1", "p1", "c1");

        verify(repository).decrementCommentCount("p1");
    }

    @Test
    @DisplayName("deleteComment — 작성자가 아니면 예외")
    void deleteComment_notAuthor_throws() {
        when(repository.findComment("p1", "c1")).thenReturn(Optional.of(comment("other")));

        assertThatThrownBy(() -> service.deleteComment("user1", "p1", "c1"))
                .isInstanceOf(CommunityException.class);
    }
}
