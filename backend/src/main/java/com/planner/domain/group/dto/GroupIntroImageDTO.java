package com.planner.domain.group.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupIntroImageDTO {
    private String imageId;
    private String url;
    private String status;
}
