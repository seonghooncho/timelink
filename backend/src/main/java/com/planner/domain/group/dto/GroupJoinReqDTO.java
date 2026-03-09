package com.planner.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupJoinReqDTO {
    @NotBlank private String inviteCode;
}
