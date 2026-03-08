package com.planner.domain.coordination.dto.res;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class HeatmapEntryDTO {
    private String date;
    private Integer hour;
    private int count;
    private List<String> users;
}
