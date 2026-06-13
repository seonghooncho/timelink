package com.planner.domain.group.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GroupUpdateReqDTO {
    @Size(max = 30)
    private String name;
    @Size(max = 200)
    private String description;
    private String imageUrl;
    private String imageId;
    private String visibility;
}
