package com.planner.domain.profile.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileResDTO {
    private String id;
    private String nickname;
    private String avatarUrl;
    private String imageId;
    private String imageStatus;
    private String termsVersion;
    private String termsAgreedAt;
    private String privacyVersion;
    private String privacyAgreedAt;
    private Boolean requiredConsentCompleted;
    private String createdAt;
    private String updatedAt;
}
