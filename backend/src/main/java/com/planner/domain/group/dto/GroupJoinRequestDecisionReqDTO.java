package com.planner.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupJoinRequestDecisionReqDTO {
    @NotBlank
    private String status;
}
