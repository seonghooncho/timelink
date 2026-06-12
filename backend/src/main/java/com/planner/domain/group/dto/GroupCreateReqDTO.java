package com.planner.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupCreateReqDTO {
    @NotBlank private String name;
    private String description;
    private String imageUrl;
    private String imageId;
}
