package com.planner.domain.coordination.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CoordinationCreateReqDTO {
    @NotBlank private String title;
    @NotBlank private String mode;
    @NotNull private List<String> dates;
    @NotNull private Integer startHour;
    @NotNull private Integer endHour;
}
