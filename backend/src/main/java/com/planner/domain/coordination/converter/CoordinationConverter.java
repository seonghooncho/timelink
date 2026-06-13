package com.planner.domain.coordination.converter;

import com.planner.domain.coordination.dto.res.*;
import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.model.CoordinationResponse;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class CoordinationConverter {

    private CoordinationConverter() {}

    public static CoordinationResDTO toResponse(Coordination c) {
        return CoordinationResDTO.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .mode(c.getMode())
                .dates(c.getDates())
                .startHour(c.getStartHour())
                .endHour(c.getEndHour())
                .status(c.getStatus())
                .createdBy(c.getCreatedBy())
                .createdAt(c.getCreatedAt())
                .build();
    }

    /** responseCount를 포함하는 목록 조회용 변환 */
    public static CoordinationResDTO toResponseWithCount(Coordination c, int responseCount) {
        return CoordinationResDTO.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .mode(c.getMode())
                .dates(c.getDates())
                .startHour(c.getStartHour())
                .endHour(c.getEndHour())
                .status(c.getStatus())
                .responseCount(responseCount)
                .createdBy(c.getCreatedBy())
                .createdAt(c.getCreatedAt())
                .build();
    }

    public static CoordinationDetailResDTO toDetailResponse(
            Coordination coord,
            List<CoordinationResponse> allResponses,
            List<CoordinationResponse> myResponses) {

        Map<String, List<CoordinationResponse>> slotMap = allResponses.stream()
                .collect(Collectors.groupingBy(r -> r.getDate() + "-" + r.getHour()));

        List<HeatmapEntryDTO> heatmap = slotMap.entrySet().stream()
                .map(e -> {
                    CoordinationResponse first = e.getValue().get(0);
                    return HeatmapEntryDTO.builder()
                            .date(first.getDate())
                            .hour(first.getHour())
                            .count(e.getValue().size())
                            .users(e.getValue().stream()
                                    .map(CoordinationResponse::getUserId)
                                    .collect(Collectors.toList()))
                            .build();
                })
                .collect(Collectors.toList());

        List<SlotEntryDTO> mySlots = myResponses.stream()
                .map(r -> SlotEntryDTO.builder()
                        .date(r.getDate())
                        .hour(r.getHour())
                        .build())
                .collect(Collectors.toList());

        return CoordinationDetailResDTO.builder()
                .id(coord.getId())
                .title(coord.getTitle())
                .description(coord.getDescription())
                .mode(coord.getMode())
                .dates(coord.getDates())
                .startHour(coord.getStartHour())
                .endHour(coord.getEndHour())
                .status(coord.getStatus())
                .heatmap(heatmap)
                .myResponses(mySlots)
                .build();
    }
}
