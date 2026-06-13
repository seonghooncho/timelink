package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupIntroPostPreviewDTO {
    private String id;
    private String title;
    private String contentSnippet;
    private String authorNickname;
    private String createdAt;
}
