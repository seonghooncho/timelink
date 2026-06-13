package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GroupIntroResDTO {
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private String imageId;
    private String imageStatus;
    private String visibility;
    private int memberCount;
    private String myRole;
    private String joinRequestStatus;
    private String introText;
    private List<GroupIntroImageDTO> images;
    private List<GroupIntroNoticeDTO> notices;
    private List<GroupIntroPostPreviewDTO> postPreviews;
    private boolean member;
    private boolean canEditIntro;
    private boolean canWriteNotice;
}
