package com.planner.domain.coordination.dto.res;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MyResponsesResultDTO {
    private List<SlotEntryDTO> slots;
}
