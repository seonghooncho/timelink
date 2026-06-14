package com.planner.domain.group.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.group.dto.GroupCreateReqDTO;
import com.planner.domain.group.dto.GroupDetailResDTO;
import com.planner.domain.group.dto.GroupIntroResDTO;
import com.planner.domain.group.dto.GroupJoinRequestCreateReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestDecisionReqDTO;
import com.planner.domain.group.dto.GroupJoinRequestResDTO;
import com.planner.domain.group.dto.GroupResDTO;
import com.planner.domain.group.dto.GroupUpdateReqDTO;
import com.planner.domain.group.error.GroupErrorCode;
import com.planner.domain.group.error.GroupException;
import com.planner.domain.group.service.GroupService;
import com.planner.domain.schedule.service.ScheduleService;
import com.planner.global.config.JwtProperties;
import com.planner.global.cursor.CursorPageResult;
import com.planner.global.error.GlobalExceptionHandler;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.JwtAuthenticationFilter;
import com.planner.global.security.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GroupController.class)
@Import(GlobalExceptionHandler.class)
class GroupControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GroupService service;
    @MockBean private ScheduleService scheduleService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/groups";

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2, FilterChain.class);
            chain.doFilter(
                    invocation.getArgument(0, ServletRequest.class),
                    invocation.getArgument(1, ServletResponse.class)
            );
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @DisplayName("GET /groups — 인증 없으면 401")
    void getMyGroups_unauthenticated() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups — 내 그룹 목록 200")
    void getMyGroups_returns200() throws Exception {
        GroupResDTO dto = GroupResDTO.builder().id("g1").name("Study").memberCount(3).build();
        CursorPageResult<GroupResDTO> page = CursorPageResult.<GroupResDTO>builder().items(List.of(dto)).build();
        when(service.getMyGroupsPaged("user1", 20, null)).thenReturn(page);
        when(service.toPageMeta(page, 20))
                .thenReturn(CustomResponse.PageMeta.builder().perPage(20).build());

        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Study"))
                .andExpect(jsonPath("$.meta.perPage").value(20));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups — limit 최대값은 100")
    void getMyGroups_clampsLimit() throws Exception {
        CursorPageResult<GroupResDTO> page = CursorPageResult.<GroupResDTO>builder().items(List.of()).build();
        when(service.getMyGroupsPaged("user1", 100, "cursor-1")).thenReturn(page);
        when(service.toPageMeta(page, 100))
                .thenReturn(CustomResponse.PageMeta.builder().perPage(100).build());

        mockMvc.perform(get(BASE)
                        .param("limit", "200")
                        .param("cursor", "cursor-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.perPage").value(100));

        verify(service).getMyGroupsPaged("user1", 100, "cursor-1");
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups/public — 공개 모임 목록 200")
    void getPublicGroups_returns200() throws Exception {
        GroupResDTO dto = GroupResDTO.builder()
                .id("g1").name("Open Study").visibility("PUBLIC").memberCount(3).build();
        CursorPageResult<GroupResDTO> page = CursorPageResult.<GroupResDTO>builder().items(List.of(dto)).build();
        when(service.getPublicGroupsPaged("user1", 20, null, null)).thenReturn(page);
        when(service.toPageMeta(page, 20))
                .thenReturn(CustomResponse.PageMeta.builder().perPage(20).build());

        mockMvc.perform(get(BASE + "/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].visibility").value("PUBLIC"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups/public — 검색어를 서비스로 전달한다")
    void getPublicGroups_passesQuery() throws Exception {
        CursorPageResult<GroupResDTO> page = CursorPageResult.<GroupResDTO>builder().items(List.of()).build();
        when(service.getPublicGroupsPaged("user1", 20, null, "study")).thenReturn(page);
        when(service.toPageMeta(page, 20))
                .thenReturn(CustomResponse.PageMeta.builder().perPage(20).build());

        mockMvc.perform(get(BASE + "/public").param("q", "study"))
                .andExpect(status().isOk());

        verify(service).getPublicGroupsPaged("user1", 20, null, "study");
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups/{id} — 상세 조회 200")
    void getDetail_returns200() throws Exception {
        GroupDetailResDTO dto = GroupDetailResDTO.builder()
                .id("g1").name("Study").members(List.of()).build();
        when(service.getDetail("user1", "g1")).thenReturn(dto);

        mockMvc.perform(get(BASE + "/g1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("g1"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups/{id} — 멤버 아니면 403")
    void getDetail_notMember_returns403() throws Exception {
        when(service.getDetail("user1", "g1"))
                .thenThrow(new GroupException(GroupErrorCode.NOT_GROUP_MEMBER));

        mockMvc.perform(get(BASE + "/g1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /groups/{id}/intro — 소개 조회 200")
    void getIntro_returns200() throws Exception {
        GroupIntroResDTO dto = GroupIntroResDTO.builder()
                .id("g1")
                .name("Open Study")
                .memberCount(3)
                .member(false)
                .build();
        when(service.getIntro("user1", "g1")).thenReturn(dto);

        mockMvc.perform(get(BASE + "/g1/intro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Open Study"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /groups — 생성 201")
    void create_returns201() throws Exception {
        GroupCreateReqDTO req = new GroupCreateReqDTO();
        req.setName("New Group");

        GroupDetailResDTO res = GroupDetailResDTO.builder()
                .id("g2").name("New Group").members(List.of()).build();
        when(service.create(eq("user1"), any())).thenReturn(res);

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("New Group"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /groups — name 누락 시 400")
    void create_invalid_returns400() throws Exception {
        GroupCreateReqDTO req = new GroupCreateReqDTO(); // name blank

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("PATCH /groups/{id} — 그룹 정보 수정 200")
    void update_returns200() throws Exception {
        GroupUpdateReqDTO req = new GroupUpdateReqDTO();
        req.setName("Updated");

        GroupDetailResDTO res = GroupDetailResDTO.builder()
                .id("g1").name("Updated").members(List.of()).build();
        when(service.update(eq("user1"), eq("g1"), any())).thenReturn(res);

        mockMvc.perform(patch(BASE + "/g1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Updated"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("DELETE /groups/{id} — 삭제 204")
    void delete_returns204() throws Exception {
        doNothing().when(service).delete("user1", "g1");

        mockMvc.perform(delete(BASE + "/g1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("DELETE /groups/{id}/members/{memberUserId} — 멤버 내보내기 204")
    void removeMember_returns204() throws Exception {
        doNothing().when(service).removeMember("user1", "g1", "user2");

        mockMvc.perform(delete(BASE + "/g1/members/user2").with(csrf()))
                .andExpect(status().isNoContent());

        verify(service).removeMember("user1", "g1", "user2");
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /groups/{id}/join-requests — 가입요청 생성 201")
    void requestToJoin_returns201() throws Exception {
        GroupJoinRequestCreateReqDTO req = new GroupJoinRequestCreateReqDTO();
        req.setMessage("함께 참여하고 싶습니다");
        GroupJoinRequestResDTO res = GroupJoinRequestResDTO.builder()
                .groupId("g1").userId("user1").status("PENDING").build();
        when(service.requestToJoin(eq("user1"), eq("g1"), any())).thenReturn(res);

        mockMvc.perform(post(BASE + "/g1/join-requests").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "manager")
    @DisplayName("GET /groups/{id}/join-requests — 가입요청 목록 200")
    void getJoinRequests_returns200() throws Exception {
        GroupJoinRequestResDTO res = GroupJoinRequestResDTO.builder()
                .groupId("g1").userId("user1").status("PENDING").build();
        when(service.getJoinRequests("manager", "g1")).thenReturn(List.of(res));

        mockMvc.perform(get(BASE + "/g1/join-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].userId").value("user1"));
    }

    @Test
    @WithMockUser(username = "manager")
    @DisplayName("PATCH /groups/{id}/join-requests/{userId} — 가입요청 승인 200")
    void decideJoinRequest_returns200() throws Exception {
        GroupJoinRequestDecisionReqDTO req = new GroupJoinRequestDecisionReqDTO();
        req.setStatus("APPROVED");
        GroupJoinRequestResDTO res = GroupJoinRequestResDTO.builder()
                .groupId("g1").userId("user1").status("APPROVED").build();
        when(service.decideJoinRequest(eq("manager"), eq("g1"), eq("user1"), any())).thenReturn(res);

        mockMvc.perform(patch(BASE + "/g1/join-requests/user1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }
}
