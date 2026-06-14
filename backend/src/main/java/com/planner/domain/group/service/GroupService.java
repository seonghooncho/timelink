package com.planner.domain.group.service;

import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.community.repository.CommunityRepository;
import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.model.CoordinationResponse;
import com.planner.domain.coordination.repository.CoordinationRepository;
import com.planner.domain.group.converter.GroupConverter;
import com.planner.domain.group.dto.GroupCreateReqDTO;
import com.planner.domain.group.dto.GroupDetailResDTO;
import com.planner.domain.group.dto.GroupIntroImageDTO;
import com.planner.domain.group.dto.GroupIntroNoticeDTO;
import com.planner.domain.group.dto.GroupIntroPostDTO;
import com.planner.domain.group.dto.GroupIntroPostPreviewDTO;
import com.planner.domain.group.dto.GroupIntroResDTO;
import com.planner.domain.group.dto.GroupIntroUpdateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestCreateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestDecisionReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestResDTO;
import com.planner.domain.group.dto.GroupMemberActivityDTO;
import com.planner.domain.group.dto.GroupMemberProfileResDTO;
import com.planner.domain.group.dto.GroupMemberProfileUpdateReqDTO;
import com.planner.domain.group.dto.GroupMemberResDTO;
import com.planner.domain.group.dto.GroupNoticeCreateReqDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupUpdateReqDTO;
import com.planner.domain.group.error.GroupErrorCode;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupInvite;
import com.planner.domain.group.model.GroupIntro;
import com.planner.domain.group.model.GroupJoinRequest;
import com.planner.domain.group.model.GroupMember;
import com.planner.domain.group.model.GroupNotice;
import com.planner.domain.group.repository.GroupRepository;
import com.planner.domain.notification.service.NotificationService;
import com.planner.domain.profile.model.Profile;
import com.planner.domain.profile.repository.ProfileRepository;
import com.planner.domain.schedule.model.Schedule;
import com.planner.domain.schedule.repository.ScheduleRepository;
import com.planner.domain.schedule.service.ScheduleService;
import com.planner.domain.storage.model.ImagePurpose;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.model.ImageUpload;
import com.planner.domain.storage.repository.ImageUploadRepository;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorCodec;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import com.planner.global.response.CustomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private static final int INVITE_CODE_RETRY_LIMIT = 10;
    private static final String VISIBILITY_PRIVATE = "PRIVATE";
    private static final String VISIBILITY_PUBLIC = "PUBLIC";
    private static final String JOIN_REQUEST_PENDING = "PENDING";
    private static final String JOIN_REQUEST_APPROVED = "APPROVED";
    private static final String JOIN_REQUEST_REJECTED = "REJECTED";
    private static final int INTRO_IMAGE_LIMIT = 10;
    private static final int INTRO_NOTICE_LIMIT = 5;
    private static final int INTRO_POST_PREVIEW_LIMIT = 5;
    private static final int INTRO_MEMBER_PREVIEW_LIMIT = 6;
    private static final int MEMBER_PROFILE_ACTIVITY_SCAN_LIMIT = 20;
    private static final int MEMBER_PROFILE_ACTIVITY_LIMIT = 3;
    private static final int PUBLIC_GROUP_SEARCH_SCAN_PAGES = 5;
    private static final int GROUP_CARD_SCHEDULE_PREVIEW_LIMIT = 2;
    private static final int GROUP_CARD_SCHEDULE_SCAN_LIMIT = 30;
    private static final int GROUP_CARD_COORDINATION_SCAN_LIMIT = 10;

    private final GroupRepository repository;
    private final ProfileRepository profileRepository;
    private final NotificationService notificationService;
    private final CursorCodec cursorCodec;
    private final StorageService storageService;
    private final ScheduleRepository scheduleRepository;
    private final ScheduleService scheduleService;
    private final ImageUploadRepository imageUploadRepository;
    private final CommunityRepository communityRepository;
    private final CoordinationRepository coordinationRepository;

    public GroupDetailResDTO create(String userId, GroupCreateReqDTO req) {
        String groupId = UUID.randomUUID().toString();
        String now = Instant.now().toString();
        String inviteCode = createUniqueInviteCode(groupId, now);

        Group group = Group.builder()
                .pk("GROUP#" + groupId).sk("METADATA")
                .id(groupId).name(req.getName()).description(req.getDescription())
                .imageUrl(req.getImageUrl()).createdBy(userId)
                .visibility(normalizeVisibility(req.getVisibility()))
                .inviteCode(inviteCode)
                .memberCount(1)
                .createdAt(now).updatedAt(now)
                .build();
        applyPublicIndexFields(group);
        repository.saveGroup(group);
        applyGroupImage(userId, group, req.getImageId());

        GroupMember member = GroupMember.builder()
                .pk("GROUP#" + groupId).sk("MEMBER#" + userId)
                .id(UUID.randomUUID().toString()).groupId(groupId).userId(userId)
                .role("manager")
                .nickname(getProfileNickname(userId))
                .avatarUrl(getProfileAvatarUrl(userId))
                .thumbnailUrl(getProfileThumbnailUrl(userId))
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

    public CursorPageResult<GroupResDTO> getPublicGroupsPaged(String userId, Integer limit, String cursorToken) {
        return getPublicGroupsPaged(userId, limit, cursorToken, null);
    }

    public CursorPageResult<GroupResDTO> getPublicGroupsPaged(String userId, Integer limit, String cursorToken, String query) {
        int size = (limit != null && limit > 0) ? limit : 20;
        Cursor cursor = (cursorToken != null) ? cursorCodec.decode(cursorToken) : null;
        if (!StringUtils.hasText(query)) {
            CursorPageResult<Group> page = repository.findPublicGroupsPaged(size, cursor);
            return CursorPageResult.<GroupResDTO>builder()
                    .items(toPublicGroupResponses(userId, page.getItems()))
                    .nextCursor(page.getNextCursor())
                    .build();
        }

        String normalizedQuery = query.trim().toLowerCase();
        List<Group> matched = new ArrayList<>();
        Cursor nextCursor = cursor;
        int scannedPages = 0;
        while (matched.size() < size && scannedPages < PUBLIC_GROUP_SEARCH_SCAN_PAGES) {
            CursorPageResult<Group> page = repository.findPublicGroupsPaged(size, nextCursor);
            page.getItems().stream()
                    .filter(group -> matchesPublicGroupQuery(group, normalizedQuery))
                    .forEach(matched::add);
            nextCursor = page.getNextCursor();
            scannedPages++;
            if (nextCursor == null) {
                break;
            }
        }
        return CursorPageResult.<GroupResDTO>builder()
                .items(toPublicGroupResponses(userId, matched.stream().limit(size).toList()))
                .nextCursor(nextCursor)
                .build();
    }

    public CustomResponse.PageMeta toPageMeta(CursorPageResult<?> page, int perPage) {
        return CustomResponse.PageMeta.builder()
                .perPage(perPage)
                .nextCursor(page.getNextCursor() != null ? cursorCodec.encode(page.getNextCursor()) : null)
                .build();
    }

    private List<GroupResDTO> toGroupListResponses(List<GroupMember> memberships) {
        Map<String, Group> groupsById = repository.findGroupsByIds(
                memberships.stream()
                        .map(this::resolveGroupIdFromMembership)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet())
        );

        return memberships.stream()
                .map(m -> {
                    String groupId = resolveGroupIdFromMembership(m);
                    Group group = groupsById.get(groupId);
                    if (group == null) {
                        return null;
                    }
                    UpcomingScheduleSummary scheduleSummary = findUpcomingScheduleSummary(groupId);
                    Coordination activeCoordination = scheduleSummary.nextSchedule == null
                            ? findActiveCoordination(groupId)
                            : null;
                    return GroupConverter.toListResponse(
                            group,
                            m,
                            resolveMemberCount(group, groupId),
                            scheduleSummary.nextSchedule,
                            scheduleSummary.upcomingScheduleCount,
                            activeCoordination
                    );
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private String resolveGroupIdFromMembership(GroupMember membership) {
        if (membership == null) {
            return null;
        }
        if (StringUtils.hasText(membership.getGroupId())) {
            return membership.getGroupId();
        }
        String gsi2sk = membership.getGsi2sk();
        if (StringUtils.hasText(gsi2sk) && gsi2sk.startsWith("GROUP#")) {
            return gsi2sk.substring("GROUP#".length());
        }
        return null;
    }

    private List<GroupResDTO> toPublicGroupResponses(String userId, List<Group> groups) {
        return groups.stream()
                .map(group -> {
                    GroupMember membership = repository.findMember(group.getId(), userId).orElse(null);
                    GroupJoinRequest joinRequest = membership == null
                            ? repository.findJoinRequest(group.getId(), userId).orElse(null)
                            : null;
                    return GroupConverter.toPublicListResponse(
                            group,
                            membership,
                            joinRequest,
                            resolveMemberCount(group, group.getId())
                    );
                })
                .collect(Collectors.toList());
    }

    private boolean matchesPublicGroupQuery(Group group, String normalizedQuery) {
        String name = group.getName() != null ? group.getName().toLowerCase() : "";
        String description = group.getDescription() != null ? group.getDescription().toLowerCase() : "";
        return name.contains(normalizedQuery) || description.contains(normalizedQuery);
    }

    private UpcomingScheduleSummary findUpcomingScheduleSummary(String groupId) {
        List<Schedule> schedules = scheduleRepository.findUpcomingByGroupId(
                groupId,
                Instant.now().toString(),
                GROUP_CARD_SCHEDULE_SCAN_LIMIT
        );
        List<Schedule> uniqueSchedules = dedupeGroupSchedules(schedules, GROUP_CARD_SCHEDULE_PREVIEW_LIMIT);
        return new UpcomingScheduleSummary(
                uniqueSchedules.isEmpty() ? null : uniqueSchedules.get(0),
                uniqueSchedules.size()
        );
    }

    private List<Schedule> dedupeGroupSchedules(List<Schedule> schedules, int limit) {
        List<Schedule> uniqueSchedules = new ArrayList<>();
        List<String> seenKeys = new ArrayList<>();
        for (Schedule schedule : schedules) {
            String key = StringUtils.hasText(schedule.getGroupScheduleId())
                    ? schedule.getGroupScheduleId()
                    : schedule.getId();
            if (!seenKeys.contains(key)) {
                seenKeys.add(key);
                uniqueSchedules.add(schedule);
            }
            if (uniqueSchedules.size() >= limit) {
                break;
            }
        }
        return uniqueSchedules;
    }

    private Coordination findActiveCoordination(String groupId) {
        return coordinationRepository.findByGroupIdPaged(groupId, GROUP_CARD_COORDINATION_SCAN_LIMIT, null)
                .getItems().stream()
                .filter(coordination -> "active".equals(coordination.getStatus()))
                .findFirst()
                .orElse(null);
    }

    private static class UpcomingScheduleSummary {
        private final Schedule nextSchedule;
        private final int upcomingScheduleCount;

        private UpcomingScheduleSummary(Schedule nextSchedule, int upcomingScheduleCount) {
            this.nextSchedule = nextSchedule;
            this.upcomingScheduleCount = upcomingScheduleCount;
        }
    }

    public GroupDetailResDTO getDetail(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        List<GroupMember> members = findMembersWithProfiles(groupId);
        return GroupConverter.toDetailResponse(group, members);
    }

    public GroupIntroResDTO getIntro(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        GroupMember membership = repository.findMember(groupId, userId).orElse(null);
        if (membership == null && !VISIBILITY_PUBLIC.equals(resolveVisibility(group))) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MEMBER);
        }

        GroupJoinRequest joinRequest = membership == null
                ? repository.findJoinRequest(groupId, userId).orElse(null)
                : null;
        GroupIntro intro = repository.findIntro(groupId).orElse(null);
        List<GroupNotice> notices = repository.findNoticesByGroupId(groupId, INTRO_NOTICE_LIMIT);
        CursorPageResult<CommunityPost> postPage = communityRepository.findGroupPostsPaged(groupId, INTRO_POST_PREVIEW_LIMIT, null);
        List<GroupMember> memberPreviews = findMemberPreviews(groupId);
        boolean member = membership != null;

        return GroupIntroResDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .imageUrl(group.getImageUrl())
                .thumbnailUrl(group.getThumbnailUrl())
                .imageId(group.getImageId())
                .imageStatus(group.getImageStatus())
                .visibility(resolveVisibility(group))
                .memberCount(resolveMemberCount(group, groupId))
                .myRole(membership != null ? membership.getRole() : null)
                .joinRequestStatus(joinRequest != null ? joinRequest.getStatus() : null)
                .introText(group.getDescription())
                .images(toIntroImages(intro))
                .notices(notices.stream().map(this::toIntroNotice).toList())
                .postPreviews(postPage.getItems().stream()
                        .map(post -> toPostPreview(post, member))
                        .toList())
                .memberPreviews(memberPreviews.stream()
                        .map(GroupConverter::toMemberResponse)
                        .toList())
                .member(member)
                .canEditIntro(membership != null && "manager".equals(membership.getRole()))
                .canWriteNotice(membership != null)
                .build();
    }

    public GroupIntroResDTO updateIntro(String userId, String groupId, GroupIntroUpdateReqDTO req) {
        verifyManager(groupId, userId);
        Group group = findGroupOrThrow(groupId);
        String now = Instant.now().toString();
        GroupIntro intro = repository.findIntro(groupId).orElseGet(() -> GroupIntro.builder()
                .pk("GROUP#" + groupId)
                .sk("INTRO")
                .groupId(groupId)
                .createdAt(now)
                .build());

        if (req.getIntroText() != null) {
            String introText = req.getIntroText().trim();
            group.setDescription(introText);
            group.setUpdatedAt(now);
            repository.saveGroup(group);
            intro.setIntroText(introText);
        }
        if (req.getImageIds() != null) {
            List<String> imageIds = req.getImageIds().stream()
                    .filter(StringUtils::hasText)
                    .map(String::trim)
                    .distinct()
                    .limit(INTRO_IMAGE_LIMIT)
                    .toList();
            imageIds.forEach(imageId -> attachOrVerifyIntroImage(userId, groupId, imageId));
            intro.setImageIds(imageIds);
        }

        intro.setUpdatedBy(userId);
        intro.setUpdatedAt(now);
        repository.saveIntro(intro);
        return getIntro(userId, group.getId());
    }

    public GroupIntroNoticeDTO createNotice(String userId, String groupId, GroupNoticeCreateReqDTO req) {
        Group group = findGroupOrThrow(groupId);
        verifyMembership(groupId, userId);
        String now = Instant.now().toString();
        String id = UUID.randomUUID().toString();
        Profile profile = profileRepository.findByUserId(userId).orElse(null);
        GroupNotice notice = GroupNotice.builder()
                .pk("GROUP#" + groupId)
                .sk("NOTICE#" + now + "#" + id)
                .id(id)
                .groupId(groupId)
                .title(req.getTitle().trim())
                .content(req.getContent().trim())
                .authorUserId(userId)
                .authorNickname(resolveProfileNickname(profile))
                .authorAvatarUrl(resolveProfileAvatarUrl(profile))
                .createdAt(now)
                .updatedAt(now)
                .build();
        repository.saveNotice(notice);
        notifyNoticeCreated(userId, group, notice);
        return toIntroNotice(notice);
    }

    public List<GroupIntroNoticeDTO> getNotices(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        GroupMember membership = repository.findMember(groupId, userId).orElse(null);
        if (membership == null && !VISIBILITY_PUBLIC.equals(resolveVisibility(group))) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MEMBER);
        }
        return repository.findNoticesByGroupId(groupId, INTRO_NOTICE_LIMIT).stream()
                .map(this::toIntroNotice)
                .toList();
    }

    public CursorPageResult<GroupIntroPostDTO> getIntroPosts(String userId, String groupId, Integer limit, String cursorToken) {
        Group group = findGroupOrThrow(groupId);
        GroupMember membership = repository.findMember(groupId, userId).orElse(null);
        if (membership == null && !VISIBILITY_PUBLIC.equals(resolveVisibility(group))) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MEMBER);
        }

        int size = (limit != null && limit > 0) ? Math.min(limit, 20) : 3;
        Cursor cursor = cursorToken != null ? cursorCodec.decode(cursorToken) : null;
        CursorPageResult<CommunityPost> page = communityRepository.findGroupPostsPaged(groupId, size, cursor);
        boolean member = membership != null;

        return CursorPageResult.<GroupIntroPostDTO>builder()
                .items(page.getItems().stream()
                        .map(post -> toIntroPost(post, userId, member))
                        .toList())
                .nextCursor(page.getNextCursor())
                .build();
    }

    public GroupDetailResDTO update(String userId, String groupId, GroupUpdateReqDTO req) {
        Group group = findGroupOrThrow(groupId);
        verifyManager(groupId, userId);

        if (req.getName() != null) group.setName(req.getName());
        if (req.getDescription() != null) group.setDescription(req.getDescription());
        if (req.getImageUrl() != null) group.setImageUrl(req.getImageUrl());
        if (req.getVisibility() != null) {
            group.setVisibility(normalizeVisibility(req.getVisibility()));
            applyPublicIndexFields(group);
        }
        group.setUpdatedAt(Instant.now().toString());

        repository.saveGroup(group);
        applyGroupImage(userId, group, req.getImageId());
        return getDetail(userId, groupId);
    }

    public void delete(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        verifyManager(groupId, userId);
        List<GroupMember> members = repository.findMembersByGroupId(groupId);
        notifyGroupDeleted(userId, group, members);
        scheduleService.deleteAllGroupSchedules(groupId);
        deleteAllCoordinationsForGroup(groupId);
        deleteAllGroupPosts(groupId);
        deleteGroupIntroRecords(groupId);
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
                .thumbnailUrl(getProfileThumbnailUrl(userId))
                .gsi2pk("USER#" + userId).gsi2sk("GROUP#" + group.getId())
                .joinedAt(Instant.now().toString())
                .build();
        repository.saveMember(member);
        refreshMemberCountAfterChange(group, 1);

        return getDetail(userId, group.getId());
    }

    public List<GroupMemberResDTO> getMembers(String userId, String groupId) {
        verifyMembership(groupId, userId);
        return findMembersWithProfiles(groupId).stream()
                .map(GroupConverter::toMemberResponse)
                .collect(Collectors.toList());
    }

    public GroupMemberProfileResDTO getMemberProfile(String userId, String groupId, String memberUserId) {
        verifyMembership(groupId, userId);
        GroupMember member = repository.findMember(groupId, memberUserId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
        Profile profile = profileRepository.findByUserId(memberUserId).orElse(null);
        return toMemberProfileResponse(syncMemberImageFromUpload(applyProfileFallback(member, profile)), userId);
    }

    public GroupMemberProfileResDTO updateMyMemberProfile(String userId, String groupId, GroupMemberProfileUpdateReqDTO req) {
        GroupMember member = repository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));

        if (req.getNickname() != null) {
            String nickname = req.getNickname().trim();
            if (!StringUtils.hasText(nickname)) {
                throw new CustomException(GeneralErrorCode.BAD_REQUEST, "모임 프로필 이름을 입력해주세요");
            }
            member.setNickname(nickname);
        }
        if (req.getAvatarUrl() != null) {
            member.setAvatarUrl(req.getAvatarUrl().trim());
        }
        applyGroupMemberImage(userId, groupId, member, req.getImageId());
        repository.saveMember(member);

        return toMemberProfileResponse(syncMemberImageFromUpload(member), userId);
    }

    public void leave(String userId, String groupId) {
        Group group = findGroupOrThrow(groupId);
        GroupMember member = repository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
        ensureNotLastManager(groupId, member);
        cleanupMemberDeparture(groupId, userId, userId);
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
        ensureNotLastManager(groupId, target);
        cleanupMemberDeparture(groupId, targetUserId, managerUserId);
        repository.deleteMember(groupId, targetUserId);
        refreshMemberCountAfterChange(group, -1);
        notifyMemberRemoved(group, target);
    }

    public GroupJoinRequestResDTO requestToJoin(String userId, String groupId, GroupJoinRequestCreateReqDTO req) {
        Group group = findGroupOrThrow(groupId);
        if (!VISIBILITY_PUBLIC.equals(resolveVisibility(group))) {
            throw new GroupException(GroupErrorCode.NOT_PUBLIC_GROUP);
        }

        if (repository.findMember(groupId, userId).isPresent()) {
            return GroupJoinRequestResDTO.builder()
                    .groupId(groupId)
                    .userId(userId)
                    .status(JOIN_REQUEST_APPROVED)
                    .nickname(getProfileNickname(userId))
                    .avatarUrl(getProfileAvatarUrl(userId))
                    .build();
        }

        GroupJoinRequest existing = repository.findJoinRequest(groupId, userId).orElse(null);
        if (existing != null && JOIN_REQUEST_PENDING.equals(existing.getStatus())) {
            return GroupConverter.toJoinRequestResponse(existing);
        }

        String now = Instant.now().toString();
        GroupJoinRequest joinRequest = GroupJoinRequest.builder()
                .pk("GROUP#" + groupId)
                .sk("JOIN_REQUEST#" + userId)
                .id(UUID.randomUUID().toString())
                .groupId(groupId)
                .userId(userId)
                .message(req.getMessage())
                .status(JOIN_REQUEST_PENDING)
                .nickname(getProfileNickname(userId))
                .avatarUrl(getProfileAvatarUrl(userId))
                .createdAt(now)
                .build();
        repository.saveJoinRequest(joinRequest);
        notifyJoinRequested(group, joinRequest);
        return GroupConverter.toJoinRequestResponse(joinRequest);
    }

    public List<GroupJoinRequestResDTO> getJoinRequests(String managerUserId, String groupId) {
        verifyManager(groupId, managerUserId);
        return repository.findJoinRequestsByGroupId(groupId).stream()
                .filter(request -> JOIN_REQUEST_PENDING.equals(request.getStatus()))
                .sorted((a, b) -> nullSafe(b.getCreatedAt()).compareTo(nullSafe(a.getCreatedAt())))
                .map(GroupConverter::toJoinRequestResponse)
                .collect(Collectors.toList());
    }

    public GroupJoinRequestResDTO decideJoinRequest(String managerUserId, String groupId, String targetUserId, GroupJoinRequestDecisionReqDTO req) {
        Group group = findGroupOrThrow(groupId);
        verifyManager(groupId, managerUserId);
        GroupJoinRequest joinRequest = repository.findJoinRequest(groupId, targetUserId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.JOIN_REQUEST_NOT_FOUND));
        if (!JOIN_REQUEST_PENDING.equals(joinRequest.getStatus())) {
            throw new GroupException(GroupErrorCode.INVALID_JOIN_REQUEST_STATUS);
        }

        String decision = normalizeJoinRequestDecision(req.getStatus());
        joinRequest.setStatus(decision);
        joinRequest.setDecidedAt(Instant.now().toString());

        if (JOIN_REQUEST_APPROVED.equals(decision)) {
            approveJoinRequest(group, joinRequest);
        } else {
            notifyJoinRequestRejected(group, joinRequest);
        }

        repository.saveJoinRequest(joinRequest);
        return GroupConverter.toJoinRequestResponse(joinRequest);
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
        group.setThumbnailObjectKey(upload.getThumbnailKey());
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getThumbnailUrl())) {
            group.setThumbnailUrl(upload.getThumbnailUrl());
        }
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getPublicUrl())) {
            group.setImageUrl(upload.getPublicUrl());
        }
        repository.updateGroupImageFields(group);
    }

    private void applyGroupMemberImage(String userId, String groupId, GroupMember member, String imageId) {
        if (!StringUtils.hasText(imageId)) {
            return;
        }

        ImageUpload upload = storageService.attachImageToTarget(
                userId,
                imageId,
                ImagePurpose.MEMBER,
                buildGroupMemberImageTargetId(groupId, userId)
        );
        member.setImageId(upload.getImageId());
        member.setImageStatus(upload.getStatus());
        member.setImageUploadKey(upload.getUploadKey());
        member.setImageObjectKey(upload.getPublicKey());
        member.setThumbnailObjectKey(upload.getThumbnailKey());
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getThumbnailUrl())) {
            member.setThumbnailUrl(upload.getThumbnailUrl());
        }
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus()) && StringUtils.hasText(upload.getPublicUrl())) {
            member.setAvatarUrl(upload.getPublicUrl());
        }
    }

    private void attachOrVerifyIntroImage(String userId, String groupId, String imageId) {
        ImageUpload upload = imageUploadRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지 업로드 정보를 찾을 수 없습니다"));
        if (!ImagePurpose.GROUP_INTRO.name().equals(upload.getPurpose())) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "모임 소개 이미지가 아닙니다");
        }
        if (groupId.equals(upload.getTargetId())) {
            return;
        }
        if (!userId.equals(upload.getOwnerUserId())) {
            throw new CustomException(GeneralErrorCode.FORBIDDEN, "이미지 업로드 권한이 없습니다");
        }

        String now = Instant.now().toString();
        imageUploadRepository.attachTarget(imageId, groupId, now);
        upload.setTargetId(groupId);
        upload.setUpdatedAt(now);
    }

    private List<GroupIntroImageDTO> toIntroImages(GroupIntro intro) {
        if (intro == null || intro.getImageIds() == null) {
            return List.of();
        }

        return intro.getImageIds().stream()
                .filter(StringUtils::hasText)
                .map(imageUploadRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .map(upload -> GroupIntroImageDTO.builder()
                        .imageId(upload.getImageId())
                        .url(upload.getPublicUrl())
                        .status(upload.getStatus())
                        .build())
                .toList();
    }

    private GroupIntroNoticeDTO toIntroNotice(GroupNotice notice) {
        return GroupIntroNoticeDTO.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .content(notice.getContent())
                .authorUserId(notice.getAuthorUserId())
                .authorNickname(notice.getAuthorNickname())
                .authorAvatarUrl(notice.getAuthorAvatarUrl())
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .build();
    }

    private GroupIntroPostPreviewDTO toPostPreview(CommunityPost post, boolean member) {
        boolean memberOnly = Boolean.TRUE.equals(post.getMemberOnly());
        boolean locked = memberOnly && !member;
        return GroupIntroPostPreviewDTO.builder()
                .id(post.getId())
                .title(locked ? null : post.getTitle())
                .contentSnippet(locked ? null : toContentSnippet(post.getContent()))
                .authorNickname(post.getAuthorNickname())
                .memberOnly(memberOnly)
                .locked(locked)
                .createdAt(post.getCreatedAt())
                .build();
    }

    private GroupIntroPostDTO toIntroPost(CommunityPost post, String userId, boolean member) {
        boolean memberOnly = Boolean.TRUE.equals(post.getMemberOnly());
        boolean locked = memberOnly && !member;
        return GroupIntroPostDTO.builder()
                .id(post.getId())
                .title(locked ? null : post.getTitle())
                .content(locked ? null : post.getContent())
                .contentSnippet(locked ? null : toContentSnippet(post.getContent()))
                .authorUserId(post.getAuthorUserId())
                .authorNickname(post.getAuthorNickname())
                .authorAvatarUrl(post.getAuthorAvatarUrl())
                .likeCount(post.getLikeCount() != null ? post.getLikeCount() : 0)
                .commentCount(post.getCommentCount() != null ? post.getCommentCount() : 0)
                .likedByMe(member && communityRepository.isLikedBy(post.getId(), userId))
                .mine(userId != null && userId.equals(post.getAuthorUserId()))
                .memberOnly(memberOnly)
                .locked(locked)
                .imageUrl(locked ? null : post.getImageUrl())
                .imageId(locked ? null : post.getImageId())
                .imageStatus(locked ? null : post.getImageStatus())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private String toContentSnippet(String content) {
        if (!StringUtils.hasText(content)) {
            return "";
        }
        String normalized = content.trim().replaceAll("\\s+", " ");
        return normalized.length() <= 90 ? normalized : normalized.substring(0, 90) + "...";
    }

    private void verifyMembership(String groupId, String userId) {
        repository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
    }

    private void verifyManager(String groupId, String userId) {
        GroupMember member = repository.findMember(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));
        if (!"manager".equals(member.getRole())) {
            throw new GroupException(GroupErrorCode.NOT_GROUP_MANAGER);
        }
    }

    private void ensureNotLastManager(String groupId, GroupMember member) {
        if (!"manager".equals(member.getRole())) {
            return;
        }
        long managerCount = repository.findMembersByGroupId(groupId).stream()
                .filter(groupMember -> "manager".equals(groupMember.getRole()))
                .count();
        if (managerCount <= 1) {
            throw new GroupException(GroupErrorCode.CANNOT_LEAVE_LAST_MANAGER);
        }
    }

    private void cleanupMemberDeparture(String groupId, String memberUserId, String actorUserId) {
        scheduleService.cleanupFutureGroupSchedulesForRemovedMember(actorUserId, groupId, memberUserId);
        cleanupActiveCoordinationResponses(groupId, memberUserId);
    }

    private void cleanupActiveCoordinationResponses(String groupId, String memberUserId) {
        Cursor cursor = null;
        do {
            CursorPageResult<Coordination> page = coordinationRepository.findByGroupIdPaged(groupId, 100, cursor);
            for (Coordination coordination : page.getItems()) {
                if (!"active".equals(coordination.getStatus())) {
                    continue;
                }
                List<CoordinationResponse> responses = coordinationRepository.findUserResponses(coordination.getId(), memberUserId);
                for (CoordinationResponse response : responses) {
                    coordinationRepository.deleteResponse(coordination.getId(), response.getSk());
                }
                if (!responses.isEmpty()) {
                    decrementCoordinationResponseCount(groupId, coordination, responses.size());
                }
            }
            cursor = page.getNextCursor();
        } while (cursor != null);
    }

    private void decrementCoordinationResponseCount(String groupId, Coordination coordination, int removedCount) {
        Integer currentCount = coordination.getResponseCount();
        if (currentCount != null && currentCount - removedCount < 0) {
            coordinationRepository.setResponseCount(groupId, coordination.getId(), 0);
            return;
        }
        coordinationRepository.updateResponseCount(groupId, coordination.getId(), -removedCount);
    }

    private void deleteAllCoordinationsForGroup(String groupId) {
        Cursor cursor = null;
        do {
            CursorPageResult<Coordination> page = coordinationRepository.findByGroupIdPaged(groupId, 100, cursor);
            for (Coordination coordination : page.getItems()) {
                for (CoordinationResponse response : coordinationRepository.findResponses(coordination.getId())) {
                    coordinationRepository.deleteResponse(coordination.getId(), response.getSk());
                }
                coordinationRepository.deleteCoordination(groupId, coordination.getId());
            }
            cursor = page.getNextCursor();
        } while (cursor != null);
    }

    private void deleteAllGroupPosts(String groupId) {
        Cursor cursor = null;
        do {
            CursorPageResult<CommunityPost> page = communityRepository.findGroupPostsPaged(groupId, 100, cursor);
            page.getItems().forEach(post -> communityRepository.deletePostCascade(post.getId()));
            cursor = page.getNextCursor();
        } while (cursor != null);
    }

    private void deleteGroupIntroRecords(String groupId) {
        repository.findNoticesByGroupId(groupId, 0)
                .forEach(notice -> repository.deleteNotice(groupId, notice.getSk()));
        repository.findJoinRequestsByGroupId(groupId)
                .forEach(request -> repository.deleteJoinRequest(groupId, request.getUserId()));
        repository.deleteIntro(groupId);
    }

    private List<GroupMember> findMemberPreviews(String groupId) {
        List<GroupMember> previews = repository.findMembersByGroupId(groupId, INTRO_MEMBER_PREVIEW_LIMIT);
        Map<String, Profile> profilesByUserId = profileRepository.findByUserIds(
                previews.stream()
                        .map(GroupMember::getUserId)
                        .collect(Collectors.toSet())
        );

        return previews.stream()
                .map(member -> applyProfileFallback(member, profilesByUserId.get(member.getUserId())))
                .sorted(this::compareMembersForDisplay)
                .toList();
    }

    private List<GroupMember> findMembersWithProfiles(String groupId) {
        List<GroupMember> members = repository.findMembersByGroupId(groupId);
        Map<String, Profile> profilesByUserId = profileRepository.findByUserIds(
                members.stream()
                        .map(GroupMember::getUserId)
                        .collect(Collectors.toSet())
        );

        return members.stream()
                .map(member -> applyProfileFallback(member, profilesByUserId.get(member.getUserId())))
                .collect(Collectors.toList());
    }

    private GroupMember applyProfileFallback(GroupMember member, Profile profile) {
        if (profile == null) {
            return member;
        }

        if (!StringUtils.hasText(member.getNickname()) && StringUtils.hasText(profile.getNickname())) {
            member.setNickname(profile.getNickname());
        }

        if (!StringUtils.hasText(member.getAvatarUrl()) && StringUtils.hasText(profile.getAvatarUrl())) {
            member.setAvatarUrl(profile.getAvatarUrl());
        }
        if (!StringUtils.hasText(member.getThumbnailUrl()) && StringUtils.hasText(profile.getThumbnailUrl())) {
            member.setThumbnailUrl(profile.getThumbnailUrl());
        }

        return member;
    }

    private GroupMember syncMemberImageFromUpload(GroupMember member) {
        if (!StringUtils.hasText(member.getImageId())) {
            return member;
        }

        ImageUpload upload = imageUploadRepository.findById(member.getImageId()).orElse(null);
        if (upload == null) {
            return member;
        }

        boolean changed = false;
        if (!Objects.equals(member.getImageStatus(), upload.getStatus())) {
            member.setImageStatus(upload.getStatus());
            changed = true;
        }
        if (!Objects.equals(member.getImageObjectKey(), upload.getPublicKey())) {
            member.setImageObjectKey(upload.getPublicKey());
            changed = true;
        }
        if (!Objects.equals(member.getThumbnailObjectKey(), upload.getThumbnailKey())) {
            member.setThumbnailObjectKey(upload.getThumbnailKey());
            changed = true;
        }
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus())
                && StringUtils.hasText(upload.getThumbnailUrl())
                && !Objects.equals(member.getThumbnailUrl(), upload.getThumbnailUrl())) {
            member.setThumbnailUrl(upload.getThumbnailUrl());
            changed = true;
        }
        if (ImageStatus.COMPLETED.name().equals(upload.getStatus())
                && StringUtils.hasText(upload.getPublicUrl())
                && !Objects.equals(member.getAvatarUrl(), upload.getPublicUrl())) {
            member.setAvatarUrl(upload.getPublicUrl());
            changed = true;
        }

        if (changed) {
            repository.saveMember(member);
        }
        return member;
    }

    private GroupMemberProfileResDTO toMemberProfileResponse(GroupMember member, String viewerUserId) {
        return GroupMemberProfileResDTO.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .role(member.getRole())
                .nickname(member.getNickname())
                .avatarUrl(member.getAvatarUrl())
                .thumbnailUrl(member.getThumbnailUrl())
                .imageId(member.getImageId())
                .imageStatus(member.getImageStatus())
                .joinedAt(member.getJoinedAt())
                .mine(Objects.equals(member.getUserId(), viewerUserId))
                .recentActivities(findRecentMemberActivities(member.getGroupId(), member.getUserId()))
                .build();
    }

    private List<GroupMemberActivityDTO> findRecentMemberActivities(String groupId, String memberUserId) {
        return communityRepository.findGroupPostsPaged(groupId, MEMBER_PROFILE_ACTIVITY_SCAN_LIMIT, null)
                .getItems().stream()
                .filter(post -> Objects.equals(memberUserId, post.getAuthorUserId()))
                .limit(MEMBER_PROFILE_ACTIVITY_LIMIT)
                .map(post -> GroupMemberActivityDTO.builder()
                        .id(post.getId())
                        .type("POST")
                        .title(post.getTitle())
                        .createdAt(post.getCreatedAt())
                        .build())
                .toList();
    }

    private int compareMembersForDisplay(GroupMember a, GroupMember b) {
        if (!Objects.equals(a.getRole(), b.getRole())) {
            return "manager".equals(a.getRole()) ? -1 : 1;
        }
        return nullSafe(a.getJoinedAt()).compareTo(nullSafe(b.getJoinedAt()));
    }

    private String buildGroupMemberImageTargetId(String groupId, String userId) {
        return "GROUP_MEMBER#" + groupId + "#" + userId;
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

    private String getProfileThumbnailUrl(String userId) {
        return profileRepository.findByUserId(userId)
                .map(Profile::getThumbnailUrl)
                .filter(StringUtils::hasText)
                .orElse(null);
    }

    private String resolveProfileNickname(Profile profile) {
        return profile != null && StringUtils.hasText(profile.getNickname()) ? profile.getNickname() : "사용자";
    }

    private String resolveProfileAvatarUrl(Profile profile) {
        return profile != null && StringUtils.hasText(profile.getAvatarUrl()) ? profile.getAvatarUrl() : "";
    }

    private String createUniqueInviteCode(String groupId, String now) {
        for (int attempt = 0; attempt < INVITE_CODE_RETRY_LIMIT; attempt++) {
            String inviteCode = generateInviteCode(groupId, now, attempt);
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

    private String generateInviteCode(String groupId, String now, int attempt) {
        String seed = groupId + ":" + now + ":" + attempt;
        String hex = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8))
                .toString()
                .replace("-", "");
        String base36 = new BigInteger(hex, 16).toString(36).toUpperCase(Locale.ROOT);
        return base36.length() >= 8 ? base36.substring(0, 8) : String.format("%8s", base36).replace(' ', '0');
    }

    private void notifyGroupDeleted(String userId, Group group, List<GroupMember> members) {
        String title = "모임이 삭제되었습니다";
        String content = "%s 모임이 삭제되었습니다.".formatted(group.getName());

        for (GroupMember member : members) {
            if (!userId.equals(member.getUserId())) {
                notificationService.createGroupNotification(member.getUserId(), title, content);
            }
        }
    }

    private void notifyMemberRemoved(Group group, GroupMember target) {
        notificationService.createGroupNotification(
                target.getUserId(),
                "모임에서 내보내졌습니다",
                "%s 모임에서 내보내졌습니다.".formatted(group.getName())
        );
    }

    private void notifyNoticeCreated(String userId, Group group, GroupNotice notice) {
        String content = "%s 모임: %s".formatted(group.getName(), notice.getTitle());

        for (GroupMember member : repository.findMembersByGroupId(group.getId())) {
            if (!userId.equals(member.getUserId())) {
                notificationService.createGroupNotification(
                        member.getUserId(),
                        "새 공지사항이 등록되었습니다",
                        content,
                        "GROUP",
                        group.getId(),
                        "/groups/%s/intro".formatted(group.getId())
                );
            }
        }
    }

    private void applyPublicIndexFields(Group group) {
        if (VISIBILITY_PUBLIC.equals(resolveVisibility(group))) {
            group.setGsi3pk("GROUP#PUBLIC");
            group.setGsi3sk(nullSafe(group.getCreatedAt()) + "#" + group.getId());
            return;
        }

        group.setGsi3pk(null);
        group.setGsi3sk(null);
    }

    private String normalizeVisibility(String visibility) {
        if (!StringUtils.hasText(visibility)) {
            return VISIBILITY_PRIVATE;
        }

        String normalized = visibility.trim().toUpperCase();
        if (VISIBILITY_PRIVATE.equals(normalized) || VISIBILITY_PUBLIC.equals(normalized)) {
            return normalized;
        }
        throw new GroupException(GroupErrorCode.INVALID_GROUP_VISIBILITY);
    }

    private String resolveVisibility(Group group) {
        return StringUtils.hasText(group.getVisibility()) ? group.getVisibility() : VISIBILITY_PRIVATE;
    }

    private String normalizeJoinRequestDecision(String status) {
        if (!StringUtils.hasText(status)) {
            throw new GroupException(GroupErrorCode.INVALID_JOIN_REQUEST_STATUS);
        }

        String normalized = status.trim().toUpperCase();
        if (JOIN_REQUEST_APPROVED.equals(normalized) || JOIN_REQUEST_REJECTED.equals(normalized)) {
            return normalized;
        }
        throw new GroupException(GroupErrorCode.INVALID_JOIN_REQUEST_STATUS);
    }

    private void approveJoinRequest(Group group, GroupJoinRequest request) {
        if (repository.findMember(group.getId(), request.getUserId()).isEmpty()) {
            GroupMember member = GroupMember.builder()
                    .pk("GROUP#" + group.getId()).sk("MEMBER#" + request.getUserId())
                    .id(UUID.randomUUID().toString()).groupId(group.getId()).userId(request.getUserId())
                    .role("member")
                    .nickname(getProfileNickname(request.getUserId()))
                    .avatarUrl(getProfileAvatarUrl(request.getUserId()))
                    .thumbnailUrl(getProfileThumbnailUrl(request.getUserId()))
                    .gsi2pk("USER#" + request.getUserId()).gsi2sk("GROUP#" + group.getId())
                    .joinedAt(Instant.now().toString())
                    .build();
            repository.saveMember(member);
            refreshMemberCountAfterChange(group, 1);
        }

        notificationService.createGroupNotification(
                request.getUserId(),
                "모임 가입요청이 승인되었습니다",
                "%s 모임에 참여할 수 있습니다.".formatted(group.getName()),
                "GROUP",
                group.getId(),
                "/groups/%s".formatted(group.getId())
        );
    }

    private void notifyJoinRequested(Group group, GroupJoinRequest request) {
        String requesterName = StringUtils.hasText(request.getNickname()) ? request.getNickname() : request.getUserId();
        String content = StringUtils.hasText(request.getMessage())
                ? request.getMessage()
                : "%s 모임에 가입하고 싶어합니다.".formatted(group.getName());

        for (GroupMember member : repository.findMembersByGroupId(group.getId())) {
            if ("manager".equals(member.getRole())) {
                notificationService.createGroupNotification(
                        member.getUserId(),
                        "%s님이 모임 가입을 요청했습니다".formatted(requesterName),
                        content,
                        "GROUP_JOIN_REQUEST",
                        group.getId(),
                        "/groups/%s?panel=joinRequests".formatted(group.getId())
                );
            }
        }
    }

    private void notifyJoinRequestRejected(Group group, GroupJoinRequest request) {
        notificationService.createGroupNotification(
                request.getUserId(),
                "모임 가입요청이 거절되었습니다",
                "%s 모임 가입요청이 거절되었습니다.".formatted(group.getName()),
                "GROUP",
                group.getId(),
                "/groups?tab=discover"
        );
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }
}
