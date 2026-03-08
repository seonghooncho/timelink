package com.planner.domain.group.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupCreateReqDTO {
    @NotBlank private String name;
    private String description;
    private String imageUrl;
}
