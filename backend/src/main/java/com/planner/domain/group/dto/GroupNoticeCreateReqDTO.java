package com.planner.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GroupNoticeCreateReqDTO {
    @NotBlank
    @Size(max = 80)
    private String title;

    @NotBlank
    @Size(max = 1000)
    private String content;
}
