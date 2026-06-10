package com.planner.domain.profile.service;

import com.planner.domain.profile.converter.ProfileConverter;
import com.planner.domain.profile.dto.ProfileResDTO;
import com.planner.domain.profile.dto.ProfileUpdateReqDTO;
import com.planner.domain.profile.error.ProfileErrorCode;
import com.planner.domain.profile.error.ProfileException;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.domain.profile.util.GeneratedProfileDefaults;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository repository;

    public ProfileResDTO getOrCreate(String userId) {
        return getOrCreate(userId, null);
    }

    public ProfileResDTO getOrCreate(String userId, String nicknameHint) {
        return getOrCreate(userId, nicknameHint, null);
    }

    public ProfileResDTO getOrCreate(String userId, String nicknameHint, String avatarUrlHint) {
        Profile profile = repository.findByUserId(userId).orElseGet(() -> {
            Profile p = ProfileConverter.createDefault(userId, nicknameHint);
            repository.save(p);
            return p;
        });

        if (shouldApplyNicknameHint(profile, nicknameHint)) {
            profile.setNickname(ProfileConverter.resolveNickname(nicknameHint));
            profile.setUpdatedAt(Instant.now().toString());
            repository.save(profile);
        }

        if (shouldApplyAvatarHint(profile, avatarUrlHint)) {
            profile.setAvatarUrl(avatarUrlHint.trim());
            profile.setUpdatedAt(Instant.now().toString());
            repository.save(profile);
        }

        return ProfileConverter.toResponse(userId, profile);
    }

    public ProfileResDTO update(String userId, ProfileUpdateReqDTO req) {
        Profile profile = repository.findByUserId(userId)
                .orElseThrow(() -> new ProfileException(ProfileErrorCode.PROFILE_NOT_FOUND));

        if (req.getNickname() != null) profile.setNickname(req.getNickname());
        if (req.getAvatarUrl() != null) profile.setAvatarUrl(req.getAvatarUrl());
        profile.setUpdatedAt(Instant.now().toString());

        repository.save(profile);
        return ProfileConverter.toResponse(userId, profile);
    }

    public ProfileResDTO agreeRequiredConsents(String userId) {
        Profile profile = repository.findByUserId(userId)
                .orElseGet(() -> ProfileConverter.createDefault(userId, null));

        String now = Instant.now().toString();
        profile.setTermsVersion(ProfileConverter.CURRENT_TERMS_VERSION);
        profile.setTermsAgreedAt(now);
        profile.setPrivacyVersion(ProfileConverter.CURRENT_PRIVACY_VERSION);
        profile.setPrivacyAgreedAt(now);
        profile.setUpdatedAt(now);

        repository.save(profile);
        return ProfileConverter.toResponse(userId, profile);
    }

    private boolean shouldApplyNicknameHint(Profile profile, String nicknameHint) {
        if (!StringUtils.hasText(nicknameHint)) {
            return false;
        }

        String currentNickname = profile.getNickname();
        String resolvedNickname = ProfileConverter.resolveNickname(nicknameHint);
        return !resolvedNickname.equals(currentNickname)
                && (!StringUtils.hasText(currentNickname) || isGeneratedNickname(currentNickname));
    }

    private boolean isGeneratedNickname(String nickname) {
        String normalized = nickname.trim();
        return "사용자".equals(normalized)
                || "카카오유저".equals(normalized)
                || "kakao-user".equalsIgnoreCase(normalized)
                || "google-user".equalsIgnoreCase(normalized)
                || GeneratedProfileDefaults.isGeneratedNickname(normalized);
    }

    private boolean shouldApplyAvatarHint(Profile profile, String avatarUrlHint) {
        if (!StringUtils.hasText(avatarUrlHint)) {
            return false;
        }

        String currentAvatarUrl = profile.getAvatarUrl();
        return !StringUtils.hasText(currentAvatarUrl)
                || GeneratedProfileDefaults.isGeneratedAvatarUrl(currentAvatarUrl);
    }
}
