package com.planner.domain.profile.service;

import com.planner.domain.profile.dto.ProfileResDTO;
import com.planner.domain.profile.dto.ProfileUpdateReqDTO;
import com.planner.domain.profile.error.ProfileException;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private ProfileRepository repository;

    @InjectMocks
    private ProfileService service;

    private static final String USER_ID = "user-1";

    private Profile createProfile() {
        return Profile.builder()
                .id("USER#" + USER_ID).sk("PROFILE")
                .nickname("테스트유저").avatarUrl("https://example.com/avatar.png")
                .createdAt("2025-03-09T00:00:00Z").updatedAt("2025-03-09T00:00:00Z")
                .build();
    }

    @Nested
    @DisplayName("getOrCreate")
    class GetOrCreate {

        @Test
        @DisplayName("프로필이 존재하면 반환한다")
        void shouldReturnExisting() {
            given(repository.findByUserId(USER_ID)).willReturn(Optional.of(createProfile()));

            ProfileResDTO result = service.getOrCreate(USER_ID);

            assertThat(result.getNickname()).isEqualTo("테스트유저");
            assertThat(result.getId()).isEqualTo(USER_ID);
            then(repository).should(never()).save(any());
        }

        @Test
        @DisplayName("프로필이 없으면 기본값으로 생성한다")
        void shouldCreateDefault() {
            given(repository.findByUserId(USER_ID)).willReturn(Optional.empty());

            ProfileResDTO result = service.getOrCreate(USER_ID);

            assertThat(result.getNickname()).isEqualTo("사용자");
            then(repository).should().save(any(Profile.class));
        }
    }

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("닉네임을 변경한다")
        void shouldUpdateNickname() {
            given(repository.findByUserId(USER_ID)).willReturn(Optional.of(createProfile()));

            ProfileUpdateReqDTO req = new ProfileUpdateReqDTO();
            req.setNickname("새닉네임");

            ProfileResDTO result = service.update(USER_ID, req);

            assertThat(result.getNickname()).isEqualTo("새닉네임");
            then(repository).should().save(any(Profile.class));
        }

        @Test
        @DisplayName("null 필드는 변경하지 않는다")
        void shouldIgnoreNullFields() {
            Profile profile = createProfile();
            given(repository.findByUserId(USER_ID)).willReturn(Optional.of(profile));

            ProfileUpdateReqDTO req = new ProfileUpdateReqDTO();
            // both null

            service.update(USER_ID, req);

            assertThat(profile.getNickname()).isEqualTo("테스트유저");
            assertThat(profile.getAvatarUrl()).isEqualTo("https://example.com/avatar.png");
        }

        @Test
        @DisplayName("프로필이 없으면 예외를 던진다")
        void shouldThrowWhenNotFound() {
            given(repository.findByUserId(USER_ID)).willReturn(Optional.empty());

            assertThatThrownBy(() -> service.update(USER_ID, new ProfileUpdateReqDTO()))
                    .isInstanceOf(ProfileException.class);
        }
    }
}
