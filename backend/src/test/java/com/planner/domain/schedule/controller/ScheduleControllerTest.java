package com.planner.domain.schedule.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.schedule.dto.ScheduleCreateReqDTO;
import com.planner.domain.schedule.dto.ScheduleResDTO;
import com.planner.domain.schedule.dto.ScheduleUpdateReqDTO;
import com.planner.domain.schedule.error.ScheduleErrorCode;
import com.planner.domain.schedule.error.ScheduleException;
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

@WebMvcTest(ScheduleController.class)
@Import(GlobalExceptionHandler.class)
class ScheduleControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private ScheduleService service;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/schedules";

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

    private ScheduleResDTO sampleRes() {
        return ScheduleResDTO.builder()
                .id("s1").title("Meeting").category("work")
                .startTime("2025-03-10T09:00").endTime("2025-03-10T10:00")
                .isImportant(false).isCompleted(false).hasAlarm(true)
                .build();
    }

    @Test
    @DisplayName("GET /schedules — 인증 없으면 401")
    void getAll_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /schedules — 전체 조회 200")
    void getAll_authenticated_returns200() throws Exception {
        when(service.getAllPaged("user1", 20, null))
                .thenReturn(CursorPageResult.<ScheduleResDTO>builder().items(List.of(sampleRes())).build());

        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].title").value("Meeting"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /schedules?startDate&endDate — 기간 조회")
    void getByRange_returns200() throws Exception {
        when(service.getByTimeRangePaged("user1", "2025-03-01", "2025-03-31", 20, null))
                .thenReturn(CursorPageResult.<ScheduleResDTO>builder().items(List.of(sampleRes())).build());

        mockMvc.perform(get(BASE).param("startDate", "2025-03-01").param("endDate", "2025-03-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /schedules — limit은 1~100 범위로 보정한다")
    void getAll_clampsLimitBoundaries() throws Exception {
        CursorPageResult<ScheduleResDTO> defaultPage = CursorPageResult.<ScheduleResDTO>builder().items(List.of()).build();
        CursorPageResult<ScheduleResDTO> maxPage = CursorPageResult.<ScheduleResDTO>builder().items(List.of()).build();
        when(service.getAllPaged("user1", 20, null)).thenReturn(defaultPage);
        when(service.toPageMeta(defaultPage, 20)).thenReturn(CustomResponse.PageMeta.builder().perPage(20).build());
        when(service.getAllPaged("user1", 100, "cursor-1")).thenReturn(maxPage);
        when(service.toPageMeta(maxPage, 100)).thenReturn(CustomResponse.PageMeta.builder().perPage(100).build());

        mockMvc.perform(get(BASE).param("limit", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.perPage").value(20));
        mockMvc.perform(get(BASE).param("limit", "200").param("cursor", "cursor-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.perPage").value(100));

        verify(service).getAllPaged("user1", 20, null);
        verify(service).getAllPaged("user1", 100, "cursor-1");
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /schedules/{id} — 단건 조회")
    void getById_returns200() throws Exception {
        when(service.getById("user1", "s1")).thenReturn(sampleRes());

        mockMvc.perform(get(BASE + "/s1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("s1"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /schedules/{id} — 존재하지 않으면 404")
    void getById_notFound_returns404() throws Exception {
        when(service.getById("user1", "none"))
                .thenThrow(new ScheduleException(ScheduleErrorCode.SCHEDULE_NOT_FOUND));

        mockMvc.perform(get(BASE + "/none"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("SCHEDULE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /schedules — 생성 201")
    void create_valid_returns201() throws Exception {
        ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
        req.setTitle("New"); req.setCategory("work");
        req.setStartTime("2025-03-10T09:00"); req.setDuration(1.0);

        when(service.create(eq("user1"), any())).thenReturn(sampleRes());

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Meeting"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /schedules — title 누락 시 400")
    void create_invalidBody_returns400() throws Exception {
        ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
        // title, category missing

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /schedules — 제목과 내용 최대 길이를 넘으면 400")
    void create_rejectsOverlongText() throws Exception {
        ScheduleCreateReqDTO req = new ScheduleCreateReqDTO();
        req.setTitle("가".repeat(41));
        req.setContent("나".repeat(1001));
        req.setCategory("task");
        req.setStartTime("2025-03-10T09:00");
        req.setDuration(1.0);

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());

        verify(service, never()).create(anyString(), any());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("PATCH /schedules/{id} — 수정 200")
    void update_returns200() throws Exception {
        ScheduleUpdateReqDTO req = new ScheduleUpdateReqDTO();
        req.setTitle("Updated");

        when(service.update(eq("user1"), eq("s1"), any())).thenReturn(sampleRes());

        mockMvc.perform(patch(BASE + "/s1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("DELETE /schedules/{id} — 삭제 204")
    void delete_returns204() throws Exception {
        doNothing().when(service).delete("user1", "s1");

        mockMvc.perform(delete(BASE + "/s1").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
