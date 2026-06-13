package com.planner.domain.coordination.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CoordinationCreateReqDTO {
    @NotBlank @Size(max = 80) private String title;
    @Size(max = 300) private String description;
    @NotBlank private String mode;
    @NotNull private List<String> dates;
    @NotNull private Integer startHour;
    @NotNull private Integer endHour;
}
