package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupIntroNoticeDTO {
    private String id;
    private String title;
    private String content;
    private String authorUserId;
    private String authorNickname;
    private String authorAvatarUrl;
    private String createdAt;
    private String updatedAt;
}
