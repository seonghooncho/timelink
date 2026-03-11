package com.planner.domain.group.service;

import com.planner.domain.group.converter.GroupConverter;
import com.planner.domain.group.dto.GroupCreateReqDTO;
import com.planner.domain.group.dto.GroupDetailResDTO;
import com.planner.domain.group.dto.GroupMemberResDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupUpdateReqDTO;
import com.planner.domain.group.error.GroupErrorCode;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository repository;

    public GroupDetailResDTO create(String userId, GroupCreateReqDTO req) {
        String groupId = UUID.randomUUID().toString();
        String now = Instant.now().toString();

        Group group = Group.builder()
                .pk("GROUP#" + groupId).sk("METADATA")
                .id(groupId).name(req.getName()).description(req.getDescription())
                .imageUrl(req.getImageUrl()).createdBy(userId)
                .inviteCode(generateInviteCode())
                .createdAt(now).updatedAt(now)
                .build();
        repository.saveGroup(group);

        GroupMember member = GroupMember.builder()
                .pk("GROUP#" + groupId).sk("MEMBER#" + userId)
                .id(UUID.randomUUID().toString()).groupId(groupId).userId(userId)
                .role("manager")
                .gsi2pk("USER#" + userId).gsi2sk("GROUP#" + groupId)
                .joinedAt(now)
                .build();
        repository.saveMember(member);

        return GroupConverter.toDetailResponse(group, List.of(member));
    }

    public List<GroupResDTO> getMyGroups(String userId) {
        return repository.findGroupsByUserId(userId).stream()
                .map(m -> {
                    String groupId = m.getGsi2sk().replace("GROUP#", "");
                    return repository.findGroupById(groupId)
                            .map(group -> GroupConverter.toListResponse(
                                    group,
                                    m,
                                    repository.findMembersByGroupId(groupId).size()
                            ))
                            .orElse(null);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public GroupDetailResDTO getDetail(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        List<GroupMember> members = repository.findMembersByGroupId(groupId);
        return GroupConverter.toDetailResponse(group, members);
    }

    public GroupDetailResDTO update(String userId, String groupId, GroupUpdateReqDTO req) {
        Group group = findGroupOrThrow(groupId);
        if (!group.getCreatedBy().equals(userId)) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MANAGER);
        }

        if (req.getName() != null) group.setName(req.getName());
        if (req.getDescription() != null) group.setDescription(req.getDescription());
        if (req.getImageUrl() != null) group.setImageUrl(req.getImageUrl());
        group.setUpdatedAt(Instant.now().toString());

        repository.saveGroup(group);
        return getDetail(userId, groupId);
    }

    public void delete(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        if (!group.getCreatedBy().equals(userId)) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MANAGER);
        }
        // 멤버 데이터도 함께 정리
        List<GroupMember> members = repository.findMembersByGroupId(groupId);
        for (GroupMember m : members) {
            repository.deleteMember(groupId, m.getUserId());
        }
        repository.deleteGroup(groupId);
    }

    public GroupDetailResDTO join(String userId, String inviteCode) {
        Group group = repository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new GroupException(GroupErrorCode.INVALID_INVITE_CODE));

        if (repository.findMember(group.getId(), userId).isPresent()) {
            return getDetail(userId, group.getId());
        }

        GroupMember member = GroupMember.builder()
                .pk("GROUP#" + group.getId()).sk("MEMBER#" + userId)
                .id(UUID.randomUUID().toString()).groupId(group.getId()).userId(userId)
                .role("member")
                .gsi2pk("USER#" + userId).gsi2sk("GROUP#" + group.getId())
                .joinedAt(Instant.now().toString())
                .build();
        repository.saveMember(member);

        return getDetail(userId, group.getId());
    }

    public List<GroupMemberResDTO> getMembers(String userId, String groupId) {
        verifyMembership(groupId, userId);
        return repository.findMembersByGroupId(groupId).stream()
                .map(GroupConverter::toMemberResponse)
                .collect(Collectors.toList());
    }

    public void leave(String userId, String groupId) {
        findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        repository.deleteMember(groupId, userId);
    }

    // ── private helpers ──

    private Group findGroupOrThrow(String groupId) {
        return repository.findGroupById(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));
    }

    private void verifyMembership(String groupId, String userId) {
        repository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
    }

    private String generateInviteCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(ThreadLocalRandom.current().nextInt(chars.length())));
        }
        return sb.toString();
    }
}
