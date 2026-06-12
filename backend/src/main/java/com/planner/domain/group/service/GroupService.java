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
import com.planner.domain.group.model.GroupInvite;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.notification.service.NotificationService;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.domain.storage.model.ImagePurpose;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.model.ImageUpload;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private static final int INVITE_CODE_RETRY_LIMIT = 10;

    private final GroupRepository repository;
    private final ProfileRepository profileRepository;
    private final NotificationService notificationService;
    private final CursorCodec cursorCodec;
    private final StorageService storageService;

    public GroupDetailResDTO create(String userId, GroupCreateReqDTO req) {
        String groupId = UUID.randomUUID().toString();
        String now = Instant.now().toString();
        String inviteCode = createUniqueInviteCode(groupId, now);

        Group group = Group.builder()
                .pk("GROUP#" + groupId).sk("METADATA")
                .id(groupId).name(req.getName()).description(req.getDescription())
                .imageUrl(req.getImageUrl()).createdBy(userId)
                .inviteCode(inviteCode)
                .memberCount(1)
                .createdAt(now).updatedAt(now)
                .build();
        repository.saveGroup(group);
        applyGroupImage(userId, group, req.getImageId());

        GroupMember member = GroupMember.builder()
                .pk("GROUP#" + groupId).sk("MEMBER#" + userId)
                .id(UUID.randomUUID().toString()).groupId(groupId).userId(userId)
                .role("manager")
                .nickname(getProfileNickname(userId))
                .avatarUrl(getProfileAvatarUrl(userId))
                .gsi2pk("USER#" + userId).gsi2sk("GROUP#" + groupId)
                .joinedAt(now)
                .build();
        repository.saveMember(member);

        return GroupConverter.toDetailResponse(group, List.of(member));
    }

    public List<GroupResDTO> getMyGroups(String userId) {
        return toGroupListResponses(repository.findGroupsByUserId(userId));
    }

    public CursorPageResult<GroupResDTO> getMyGroupsPaged(String userId, Integer limit, String cursorToken) {
        int size = (limit != null && limit > 0) ? limit : 20;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;
        CursorPageResult<GroupMember> page = repository.findGroupsByUserIdPaged(userId, size, cursor);

        return CursorPageResult.<GroupResDTO>builder()
                .items(toGroupListResponses(page.getItems()))
                .nextCursor(page.getNextCursor())
                .build();
    }

    public CustomResponse.PageMeta toPageMeta(CursorPageResult<?> page, int perPage) {
        return CustomResponse.PageMeta.builder()
                .perPage(perPage)
                .nextCursor(page.getNextCursor() != null ? cursorCodec.encode(page.getNextCursor()) : null)
                .build();
    }

    private List<GroupResDTO> toGroupListResponses(List<GroupMember> memberships) {
        return memberships.stream()
                .map(m -> {
                    String groupId = m.getGsi2sk().replace("GROUP#", "");
                    return repository.findGroupById(groupId)
                            .map(group -> GroupConverter.toListResponse(
                                    group,
                                    m,
                                    resolveMemberCount(group, groupId)
                            ))
                            .orElse(null);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public GroupDetailResDTO getDetail(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        List<GroupMember> members = findMembersWithProfiles(groupId);
        return GroupConverter.toDetailResponse(group, members);
    }

    public GroupDetailResDTO update(String userId, String groupId, GroupUpdateReqDTO req) {
        Group group = findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        String previousName = group.getName();
        String previousDescription = group.getDescription();
        String previousImageId = group.getImageId();
        String previousImageUrl = group.getImageUrl();

        if (req.getName() != null) group.setName(req.getName());
        if (req.getDescription() != null) group.setDescription(req.getDescription());
        if (req.getImageUrl() != null) group.setImageUrl(req.getImageUrl());
        group.setUpdatedAt(Instant.now().toString());

        repository.saveGroup(group);
        applyGroupImage(userId, group, req.getImageId());
        if (hasGroupDisplayChange(group, previousName, previousDescription, previousImageId, previousImageUrl)) {
            notifyGroupInfoUpdated(userId, group);
        }
        return getDetail(userId, groupId);
    }

    public void delete(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        if (!group.getCreatedBy().equals(userId)) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MANAGER);
        }
        List<GroupMember> members = repository.findMembersByGroupId(groupId);
        notifyGroupDeleted(userId, group, members);
        for (GroupMember m : members) {
            repository.deleteMember(groupId, m.getUserId());
        }
        if (StringUtils.hasText(group.getInviteCode())) {
            repository.deleteInvite(group.getInviteCode());
        }
        repository.deleteGroup(groupId);
    }

    public GroupDetailResDTO join(String userId, String inviteCode) {
        GroupInvite invite = repository.findInvite(inviteCode)
                .orElseThrow(() -> new GroupException(GroupErrorCode.INVALID_INVITE_CODE));
        Group group = findGroupOrThrow(invite.getGroupId());

        if (repository.findMember(group.getId(), userId).isPresent()) {
            return getDetail(userId, group.getId());
        }

        GroupMember member = GroupMember.builder()
                .pk("GROUP#" + group.getId()).sk("MEMBER#" + userId)
                .id(UUID.randomUUID().toString()).groupId(group.getId()).userId(userId)
                .role("member")
                .nickname(getProfileNickname(userId))
                .avatarUrl(getProfileAvatarUrl(userId))
                .gsi2pk("USER#" + userId).gsi2sk("GROUP#" + group.getId())
                .joinedAt(Instant.now().toString())
                .build();
        repository.saveMember(member);
        refreshMemberCountAfterChange(group, 1);
        notifyMemberJoined(group, member);

        return getDetail(userId, group.getId());
    }

    public List<GroupMemberResDTO> getMembers(String userId, String groupId) {
        verifyMembership(groupId, userId);
        return findMembersWithProfiles(groupId).stream()
                .map(GroupConverter::toMemberResponse)
                .collect(Collectors.toList());
    }

    public void leave(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        repository.deleteMember(groupId, userId);
        refreshMemberCountAfterChange(group, -1);
    }

    public void removeMember(String managerUserId, String groupId, String targetUserId) {
        Group group = findGroupOrThrow(groupId);
        GroupMember manager = repository.findMember(groupId, managerUserId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));

        if (!"manager".equals(manager.getRole())) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MANAGER);
        }

        if (managerUserId.equals(targetUserId)) {
            throw new GroupException(GroupErrorCode.CANNOT_REMOVE_SELF);
        }

        GroupMember target = repository.findMember(groupId, targetUserId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
        repository.deleteMember(groupId, targetUserId);
        refreshMemberCountAfterChange(group, -1);
        notifyMemberRemoved(group, target);
    }

    // ── private helpers ──

    private Group findGroupOrThrow(String groupId) {
        return repository.findGroupById(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));
    }

    private void applyGroupImage(String userId, Group group, String imageId) {
        if (!StringUtils.hasText(imageId)) {
            return;
        }

        ImageUpload upload = storageService.attachImageToTarget(userId, imageId, ImagePurpose.GROUP, group.getId());
        group.setImageId(upload.getImageId());
        group.setImageStatus(upload.getStatus());
        group.setImageUploadKey(upload.getUploadKey());
        group.setImageObjectKey(upload.getPublicKey());
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getPublicUrl())) {
            group.setImageUrl(upload.getPublicUrl());
        }
        repository.updateGroupImageFields(group);
    }

    private void verifyMembership(String groupId, String userId) {
        repository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
    }

    private List<GroupMember> findMembersWithProfiles(String groupId) {
        List<GroupMember> members = repository.findMembersByGroupId(groupId);
        Map<String, Profile> profilesByUserId = profileRepository.findByUserIds(
                members.stream()
                        .map(GroupMember::getUserId)
                        .collect(Collectors.toSet())
        );

        return members.stream()
                .map(member -> applyProfileDisplay(member, profilesByUserId.get(member.getUserId())))
                .collect(Collectors.toList());
    }

    private GroupMember applyProfileDisplay(GroupMember member, Profile profile) {
        if (profile == null) {
            return member;
        }

        if (StringUtils.hasText(profile.getNickname())) {
            member.setNickname(profile.getNickname());
        }

        if (StringUtils.hasText(profile.getAvatarUrl())) {
            member.setAvatarUrl(profile.getAvatarUrl());
        }

        return member;
    }

    private String getProfileNickname(String userId) {
        return profileRepository.findByUserId(userId)
                .map(Profile::getNickname)
                .filter(StringUtils::hasText)
                .orElse(null);
    }

    private String getProfileAvatarUrl(String userId) {
        return profileRepository.findByUserId(userId)
                .map(Profile::getAvatarUrl)
                .filter(StringUtils::hasText)
                .orElse(null);
    }

    private String createUniqueInviteCode(String groupId, String now) {
        for (int attempt = 0; attempt < INVITE_CODE_RETRY_LIMIT; attempt++) {
            String inviteCode = generateInviteCode();
            GroupInvite invite = GroupInvite.builder()
                    .pk("INVITE#" + inviteCode)
                    .sk("METADATA")
                    .inviteCode(inviteCode)
                    .groupId(groupId)
                    .createdAt(now)
                    .build();
            if (repository.saveInviteIfAbsent(invite)) {
                return inviteCode;
            }
        }
        throw new GroupException(GroupErrorCode.INVALID_INVITE_CODE);
    }

    private int resolveMemberCount(Group group, String groupId) {
        if (group.getMemberCount() != null && group.getMemberCount() >= 0) {
            return group.getMemberCount();
        }
        return repository.findMembersByGroupId(groupId).size();
    }

    private void refreshMemberCountAfterChange(Group group, int delta) {
        if (group.getMemberCount() == null) {
            repository.setMemberCount(group.getId(), repository.findMembersByGroupId(group.getId()).size());
            return;
        }
        repository.updateMemberCount(group.getId(), delta);
    }

    private String generateInviteCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(ThreadLocalRandom.current().nextInt(chars.length())));
        }
        return sb.toString();
    }

    private void notifyMemberJoined(Group group, GroupMember joinedMember) {
        String joinedName = StringUtils.hasText(joinedMember.getNickname())
                ? joinedMember.getNickname()
                : joinedMember.getUserId();
        String title = "새 멤버가 참여했습니다";
        String content = "%s 그룹에 %s님이 들어왔습니다.".formatted(group.getName(), joinedName);

        for (GroupMember member : repository.findMembersByGroupId(group.getId())) {
            if (!joinedMember.getUserId().equals(member.getUserId())) {
                notificationService.createGroupNotification(member.getUserId(), title, content);
            }
        }
    }

    private void notifyGroupInfoUpdated(String userId, Group group) {
        String title = "그룹 정보가 변경되었습니다";
        String content = "%s 그룹 정보가 변경되었습니다.".formatted(group.getName());

        for (GroupMember member : repository.findMembersByGroupId(group.getId())) {
            if (!userId.equals(member.getUserId())) {
                notificationService.createGroupNotification(member.getUserId(), title, content);
            }
        }
    }

    private void notifyGroupDeleted(String userId, Group group, List<GroupMember> members) {
        String title = "그룹이 삭제되었습니다";
        String content = "%s 그룹이 삭제되었습니다.".formatted(group.getName());

        for (GroupMember member : members) {
            if (!userId.equals(member.getUserId())) {
                notificationService.createGroupNotification(member.getUserId(), title, content);
            }
        }
    }

    private void notifyMemberRemoved(Group group, GroupMember target) {
        notificationService.createGroupNotification(
                target.getUserId(),
                "그룹에서 내보내졌습니다",
                "%s 그룹에서 내보내졌습니다.".formatted(group.getName())
        );
    }

    private boolean hasGroupDisplayChange(
            Group group,
            String previousName,
            String previousDescription,
            String previousImageId,
            String previousImageUrl
    ) {
        return !Objects.equals(previousName, group.getName())
                || !Objects.equals(previousDescription, group.getDescription())
                || !Objects.equals(previousImageId, group.getImageId())
                || !Objects.equals(previousImageUrl, group.getImageUrl());
    }
}
