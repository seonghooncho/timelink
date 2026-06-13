package com.planner.domain.group.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GroupMemberProfileUpdateReqDTO {
    @Size(max = 20)
    private String nickname;
    private String avatarUrl;
    private String imageId;
}
