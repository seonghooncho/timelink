package com.planner.domain.group.converter;

import com.planner.domain.group.dto.res.GroupDetailResDTO;
import com.planner.domain.group.dto.res.GroupMemberResDTO;
import com.planner.domain.group.dto.res.GroupResDTO;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;

import java.util.List;
import java.util.stream.Collectors;

public final class GroupConverter {

    private GroupConverter() {}

    public static GroupResDTO toListResponse(Group group, GroupMember membership) {
        return GroupResDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .imageUrl(group.getImageUrl())
                .inviteCode(group.getInviteCode())
                .myRole(membership.getRole())
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
                .inviteCode(group.getInviteCode())
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
}
