package com.planner.domain.group.converter;

import com.planner.domain.group.dto.GroupDetailResDTO;
import com.planner.domain.group.dto.GroupCoordinationSummaryDTO;
import com.planner.domain.group.dto.GroupJoinRequestResDTO;
import com.planner.domain.group.dto.GroupMemberResDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupScheduleSummaryDTO;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupJoinRequest;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.schedule.model.Schedule;

import java.util.List;
import java.util.stream.Collectors;

public final class GroupConverter {

    private GroupConverter() {}

    public static GroupResDTO toListResponse(Group group, GroupMember membership, int memberCount) {
        return toListResponse(group, membership, memberCount, null, 0, null);
    }

    public static GroupResDTO toListResponse(Group group, GroupMember membership, int memberCount, Schedule nextSchedule) {
        return toListResponse(group, membership, memberCount, nextSchedule, nextSchedule != null ? 1 : 0, null);
    }

    public static GroupResDTO toListResponse(
            Group group,
            GroupMember membership,
            int memberCount,
            Schedule nextSchedule,
            int upcomingScheduleCount,
            Coordination activeCoordination) {
        return GroupResDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .imageUrl(group.getImageUrl())
                .imageId(group.getImageId())
                .imageStatus(group.getImageStatus())
                .inviteCode(group.getInviteCode())
                .visibility(resolveVisibility(group))
                .memberCount(memberCount)
                .myRole(membership.getRole())
                .nextSchedule(toScheduleSummary(nextSchedule))
                .upcomingScheduleCount(upcomingScheduleCount)
                .activeCoordination(toCoordinationSummary(activeCoordination))
                .createdAt(group.getCreatedAt())
                .build();
    }

    public static GroupResDTO toPublicListResponse(Group group, GroupMember membership, GroupJoinRequest joinRequest, int memberCount) {
        return GroupResDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .imageUrl(group.getImageUrl())
                .imageId(group.getImageId())
                .imageStatus(group.getImageStatus())
                .visibility(resolveVisibility(group))
                .memberCount(memberCount)
                .myRole(membership != null ? membership.getRole() : null)
                .joinRequestStatus(joinRequest != null ? joinRequest.getStatus() : null)
                .upcomingScheduleCount(0)
                .createdAt(group.getCreatedAt())
                .build();
    }

    public static GroupDetailResDTO toDetailResponse(Group group, List<GroupMember> members) {
        List<GroupMemberResDTO> memberDtos = members.stream()
                .map(GroupConverter::toMemberResponse)
                .collect(Collectors.toList());

        return GroupDetailResDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .imageUrl(group.getImageUrl())
                .imageId(group.getImageId())
                .imageStatus(group.getImageStatus())
                .inviteCode(group.getInviteCode())
                .visibility(resolveVisibility(group))
                .createdBy(group.getCreatedBy())
                .members(memberDtos)
                .createdAt(group.getCreatedAt())
                .build();
    }

    public static GroupMemberResDTO toMemberResponse(GroupMember m) {
        return GroupMemberResDTO.builder()
                .id(m.getId())
                .userId(m.getUserId())
                .role(m.getRole())
                .nickname(m.getNickname())
                .avatarUrl(m.getAvatarUrl())
                .joinedAt(m.getJoinedAt())
                .build();
    }

    public static GroupJoinRequestResDTO toJoinRequestResponse(GroupJoinRequest request) {
        return GroupJoinRequestResDTO.builder()
                .id(request.getId())
                .groupId(request.getGroupId())
                .userId(request.getUserId())
                .message(request.getMessage())
                .status(request.getStatus())
                .nickname(request.getNickname())
                .avatarUrl(request.getAvatarUrl())
                .createdAt(request.getCreatedAt())
                .decidedAt(request.getDecidedAt())
                .build();
    }

    private static GroupScheduleSummaryDTO toScheduleSummary(Schedule schedule) {
        if (schedule == null) {
            return null;
        }
        return GroupScheduleSummaryDTO.builder()
                .id(schedule.getId())
                .title(schedule.getTitle())
                .startTime(schedule.getStartTime())
                .duration(schedule.getDuration())
                .build();
    }

    private static GroupCoordinationSummaryDTO toCoordinationSummary(Coordination coordination) {
        if (coordination == null) {
            return null;
        }
        return GroupCoordinationSummaryDTO.builder()
                .id(coordination.getId())
                .title(coordination.getTitle())
                .description(coordination.getDescription())
                .mode(coordination.getMode())
                .dates(coordination.getDates())
                .startHour(coordination.getStartHour())
                .endHour(coordination.getEndHour())
                .status(coordination.getStatus())
                .responseCount(coordination.getResponseCount() != null ? coordination.getResponseCount() : 0)
                .createdAt(coordination.getCreatedAt())
                .build();
    }

    private static String resolveVisibility(Group group) {
        return group.getVisibility() != null ? group.getVisibility() : "PRIVATE";
    }
}
