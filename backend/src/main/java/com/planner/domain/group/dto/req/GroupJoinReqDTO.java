package com.planner.domain.group.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupJoinReqDTO {
    @NotBlank private String inviteCode;
}
