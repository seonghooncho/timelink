package com.planner.domain.coordination.service;

import com.planner.domain.coordination.converter.CoordinationConverter;
import com.planner.domain.coordination.dto.req.CoordinationCreateReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationSubmitReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationUpdateReqDTO;
import com.planner.domain.coordination.dto.res.*;
import com.planner.domain.coordination.error.CoordinationErrorCode;
import com.planner.domain.coordination.error.CoordinationException;
import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.model.CoordinationResponse;
import com.planner.domain.coordination.repository.CoordinationRepository;
import com.planner.domain.group.error.GroupErrorCode;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.notification.service.NotificationService;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CoordinationService {

    private static final int DEFAULT_LIMIT = 20;

    private final CoordinationRepository repository;
    private final GroupRepository groupRepository;
    private final NotificationService notificationService;
    private final CursorCodec cursorCodec;

    public CoordinationResDTO create(String userId, String groupId, CoordinationCreateReqDTO req) {
        verifyMembership(groupId, userId);

        String coordId = UUID.randomUUID().toString();
        Coordination coord = Coordination.builder()
                .pk("GROUP#" + groupId).sk("COORD#" + coordId)
                .id(coordId).groupId(groupId).createdBy(userId)
                .title(req.getTitle()).mode(req.getMode())
                .dates(req.getDates()).startHour(req.getStartHour()).endHour(req.getEndHour())
                .status("active").createdAt(Instant.now().toString())
                .build();

        repository.saveCoordination(coord);
        notifyCoordinationCreated(userId, coord);
        return CoordinationConverter.toResponse(coord);
    }

    /** 커서 기반 페이지네이션 목록 조회 */
    public CursorPageResult<CoordinationResDTO> getByGroupIdPaged(String userId, String groupId, String status, Integer limit, String cursorToken) {
        verifyMembership(groupId, userId);
        int size = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;

        CursorPageResult<Coordination> page = repository.findByGroupIdPaged(groupId, size, cursor);

        List<CoordinationResDTO> filtered = page.getItems().stream()
                .filter(c -> status == null || c.getStatus().equals(status))
                .map(c -> CoordinationConverter.toResponseWithCount(c, repository.findResponses(c.getId()).size()))
                .collect(Collectors.toList());

        return CursorPageResult.<CoordinationResDTO>builder()
                .items(filtered)
                .nextCursor(page.getNextCursor())
                .build();
    }

    public CustomResponse.PageMeta toPageMeta(CursorPageResult<?> page, int perPage) {
        return CustomResponse.PageMeta.builder()
                .perPage(perPage)
                .nextCursor(page.getNextCursor() != null ? cursorCodec.encode(page.getNextCursor()) : null)
                .build();
    }

    public CoordinationDetailResDTO getDetail(String userId, String groupId, String coordId) {
        verifyMembership(groupId, userId);
        Coordination coord = repository.findCoordination(groupId, coordId)
                .orElseThrow(() -> new CoordinationException(CoordinationErrorCode.COORDINATION_NOT_FOUND));

        List<CoordinationResponse> allResponses = repository.findResponses(coordId);
        List<CoordinationResponse> myResponses = allResponses.stream()
                .filter(r -> r.getUserId().equals(userId))
                .collect(Collectors.toList());

        return CoordinationConverter.toDetailResponse(coord, allResponses, myResponses);
    }

    public CoordinationResDTO update(String userId, String groupId, String coordId, CoordinationUpdateReqDTO req) {
        Coordination coord = repository.findCoordination(groupId, coordId)
                .orElseThrow(() -> new CoordinationException(CoordinationErrorCode.COORDINATION_NOT_FOUND));
        if (!coord.getCreatedBy().equals(userId)) {
            throw new CoordinationException(CoordinationErrorCode.NOT_COORDINATION_CREATOR);
        }
        if (req.getStatus() != null) coord.setStatus(req.getStatus());
        repository.saveCoordination(coord);
        return CoordinationConverter.toResponse(coord);
    }

    public void delete(String userId, String groupId, String coordId) {
        Coordination coord = repository.findCoordination(groupId, coordId)
                .orElseThrow(() -> new CoordinationException(CoordinationErrorCode.COORDINATION_NOT_FOUND));
        if (!coord.getCreatedBy().equals(userId)) {
            throw new CoordinationException(CoordinationErrorCode.NOT_COORDINATION_CREATOR);
        }
        repository.deleteCoordination(groupId, coordId);
    }

    public SubmitResultDTO submitResponses(String userId, String groupId, String coordId, CoordinationSubmitReqDTO req) {
        verifyMembership(groupId, userId);
        Coordination coord = repository.findCoordination(groupId, coordId)
                .orElseThrow(() -> new CoordinationException(CoordinationErrorCode.COORDINATION_NOT_FOUND));

        List<CoordinationResponse> existing = repository.findUserResponses(coordId, userId);
        for (CoordinationResponse r : existing) {
            repository.deleteResponse(coordId, r.getSk());
        }

        for (SlotEntryDTO slot : req.getSlots()) {
            String sk = "RESP#" + userId + "#" + slot.getDate() + "#" + slot.getHour();
            CoordinationResponse resp = CoordinationResponse.builder()
                    .pk("COORD#" + coordId).sk(sk)
                    .coordinationId(coordId).userId(userId)
                    .date(slot.getDate()).hour(slot.getHour())
                    .createdAt(Instant.now().toString())
                    .build();
            repository.saveResponse(resp);
        }

        notifyCoordinationSubmitted(userId, coord);
        return SubmitResultDTO.builder().submittedCount(req.getSlots().size()).build();
    }

    public MyResponsesResultDTO getMyResponses(String userId, String groupId, String coordId) {
        verifyMembership(groupId, userId);
        List<CoordinationResponse> responses = repository.findUserResponses(coordId, userId);
        List<SlotEntryDTO> slots = responses.stream()
                .map(r -> SlotEntryDTO.builder().date(r.getDate()).hour(r.getHour()).build())
                .collect(Collectors.toList());
        return MyResponsesResultDTO.builder().slots(slots).build();
    }

    public void deleteMyResponses(String userId, String groupId, String coordId) {
        verifyMembership(groupId, userId);
        List<CoordinationResponse> existing = repository.findUserResponses(coordId, userId);
        for (CoordinationResponse r : existing) {
            repository.deleteResponse(coordId, r.getSk());
        }
    }

    private void verifyMembership(String groupId, String userId) {
        groupRepository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
    }

    private void notifyCoordinationCreated(String userId, Coordination coord) {
        String title = "새 시간 조율이 시작되었습니다";
        String content = "%s 조율에 참여해 주세요.".formatted(coord.getTitle());

        for (GroupMember member : groupRepository.findMembersByGroupId(coord.getGroupId())) {
            if (!userId.equals(member.getUserId())) {
                notificationService.createGroupNotificationIfEnabled(member.getUserId(), title, content);
            }
        }
    }

    private void notifyCoordinationSubmitted(String userId, Coordination coord) {
        if (userId.equals(coord.getCreatedBy())) {
            return;
        }

        notificationService.createGroupNotificationIfEnabled(
                coord.getCreatedBy(),
                "조율 응답이 등록되었습니다",
                "%s 조율에 새 응답이 등록되었습니다.".formatted(coord.getTitle())
        );
    }
}
