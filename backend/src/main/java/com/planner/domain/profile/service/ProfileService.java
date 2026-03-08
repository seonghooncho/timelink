package com.planner.domain.profile.service;

import com.planner.domain.profile.converter.ProfileConverter;
import com.planner.domain.profile.dto.req.ProfileUpdateReqDTO;
import com.planner.domain.profile.dto.res.ProfileResDTO;
import com.planner.domain.profile.error.ProfileErrorCode;
import com.planner.domain.profile.error.ProfileException;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository repository;

    public ProfileResDTO getOrCreate(String userId) {
        Profile profile = repository.findByUserId(userId).orElseGet(() -> {
            Profile p = ProfileConverter.createDefault(userId);
            repository.save(p);
            return p;
        });
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
}
