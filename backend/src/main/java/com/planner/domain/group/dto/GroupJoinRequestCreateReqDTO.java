package com.planner.domain.group.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GroupJoinRequestCreateReqDTO {
    @Size(max = 200)
    private String message;
}
