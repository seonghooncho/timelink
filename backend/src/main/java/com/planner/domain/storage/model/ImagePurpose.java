package com.planner.domain.storage.model;

import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;

import java.util.Locale;

public enum ImagePurpose {
    MEMBER("member"),
    GROUP("group"),
    SCHEDULE("schedule"),
    GROUP_INTRO("group-intro"),
    GROUP_POST("group-post"),
    COMMUNITY_POST("community-post");

    private final String prefix;

    ImagePurpose(String prefix) {
        this.prefix = prefix;
    }

    public String prefix() {
        return prefix;
    }

    public static ImagePurpose from(String value) {
        if (value == null || value.isBlank()) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지 용도를 선택해주세요");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        try {
            return ImagePurpose.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "지원하지 않는 이미지 용도입니다");
        }
    }
}
