package com.planner.domain.profile.converter;

import com.planner.domain.profile.dto.ProfileResDTO;
import com.planner.domain.profile.model.Profile;
import org.springframework.util.StringUtils;

import java.time.Instant;

public final class ProfileConverter {

    public static final String CURRENT_TERMS_VERSION = "2026-06-10";
    public static final String CURRENT_PRIVACY_VERSION = "2026-06-10";

    private ProfileConverter() {}

    public static Profile createDefault(String userId, String nicknameHint) {
        String now = Instant.now().toString();
        return Profile.builder()
                .id("USER#" + userId)
                .sk("PROFILE")
                .nickname(resolveNickname(nicknameHint))
                .avatarUrl("")
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static String resolveNickname(String nicknameHint) {
        if (!StringUtils.hasText(nicknameHint)) {
            return "사용자";
        }

        String trimmed = nicknameHint.trim();
        return trimmed.isEmpty() ? "사용자" : trimmed;
    }

    public static ProfileResDTO toResponse(String userId, Profile p) {
        return ProfileResDTO.builder()
                .id(userId)
                .nickname(p.getNickname())
                .avatarUrl(p.getAvatarUrl())
                .thumbnailUrl(p.getThumbnailUrl())
                .imageId(p.getImageId())
                .imageStatus(p.getImageStatus())
                .termsVersion(p.getTermsVersion())
                .termsAgreedAt(p.getTermsAgreedAt())
                .privacyVersion(p.getPrivacyVersion())
                .privacyAgreedAt(p.getPrivacyAgreedAt())
                .requiredConsentCompleted(isRequiredConsentCompleted(p))
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    public static boolean isRequiredConsentCompleted(Profile p) {
        return CURRENT_TERMS_VERSION.equals(p.getTermsVersion())
                && CURRENT_PRIVACY_VERSION.equals(p.getPrivacyVersion())
                && StringUtils.hasText(p.getTermsAgreedAt())
                && StringUtils.hasText(p.getPrivacyAgreedAt());
    }
}
