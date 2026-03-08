package com.planner.domain.group.dto.req;

import lombok.Data;

@Data
public class GroupUpdateReqDTO {
    private String name;
    private String description;
    private String imageUrl;
}
