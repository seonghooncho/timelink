package com.planner.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommunityCommentUpdateReqDTO {
    @NotBlank
    @Size(max = 500)
    private String content;
}
