package com.planner.domain.profile.converter;

import com.planner.domain.profile.dto.res.ProfileResDTO;
import com.planner.domain.profile.model.Profile;

import java.time.Instant;

public final class ProfileConverter {

    private ProfileConverter() {}

    public static Profile createDefault(String userId) {
        String now = Instant.now().toString();
        return Profile.builder()
                .id("USER#" + userId)
                .sk("PROFILE")
                .nickname("사용자")
                .avatarUrl("")
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static ProfileResDTO toResponse(String userId, Profile p) {
        return ProfileResDTO.builder()
                .id(userId)
                .nickname(p.getNickname())
                .avatarUrl(p.getAvatarUrl())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
