package com.planner.domain.group.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class GroupIntroUpdateReqDTO {
    @Size(max = 1000)
    private String introText;

    @Size(max = 10)
    private List<String> imageIds;
}
