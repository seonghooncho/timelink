package com.planner.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommunityPostCreateReqDTO {
    @NotBlank
    @Size(max = 80)
    private String title;

    @NotBlank
    @Size(max = 2000)
    private String content;
}
