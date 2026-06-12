package com.planner.domain.profile.dto;

import lombok.Data;

@Data
public class ProfileUpdateReqDTO {
    private String nickname;
    private String avatarUrl;
    private String imageId;
}
