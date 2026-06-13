package com.planner.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommunityPostUpdateReqDTO {
    @Size(max = 40)
    private String title;

    @Size(max = 2000)
    private String content;

    private String imageId;
}
