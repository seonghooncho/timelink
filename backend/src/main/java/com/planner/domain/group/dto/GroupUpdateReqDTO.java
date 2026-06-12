package com.planner.domain.group.dto;

import lombok.Data;

@Data
public class GroupUpdateReqDTO {
    private String name;
    private String description;
    private String imageUrl;
    private String imageId;
}
