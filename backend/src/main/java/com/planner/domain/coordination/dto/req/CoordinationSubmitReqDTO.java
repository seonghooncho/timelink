package com.planner.domain.coordination.dto.req;

import com.planner.domain.coordination.dto.res.SlotEntryDTO;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CoordinationSubmitReqDTO {
    @NotNull private List<SlotEntryDTO> slots;
}
