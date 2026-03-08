package com.planner.domain.coordination.dto.res;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CoordinationDetailResDTO {
    private String id;
    private String title;
    private String mode;
    private List<String> dates;
    private Integer startHour;
    private Integer endHour;
    private String status;
    private List<HeatmapEntryDTO> heatmap;
    private List<SlotEntryDTO> myResponses;
}
