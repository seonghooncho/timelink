package com.planner.domain.coordination.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.coordination.dto.req.CoordinationCreateReqDTO;
import com.planner.domain.coordination.dto.req.CoordinationSubmitReqDTO;
import com.planner.domain.coordination.dto.res.*;
import com.planner.domain.coordination.service.CoordinationService;
import com.planner.global.config.JwtProperties;
import com.planner.global.error.GlobalExceptionHandler;
import com.planner.global.security.JwtAuthenticationFilter;
import com.planner.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.bean.MockBean;
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

@WebMvcTest(CoordinationController.class)
@Import(GlobalExceptionHandler.class)
class CoordinationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private CoordinationService service;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/groups/g1/coordinations";

    @Test
    @DisplayName("GET /coordinations — 인증 없으면 401")
    void getAll_unauthenticated() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /coordinations — 목록 200")
    void getAll_returns200() throws Exception {
        CoordinationResDTO dto = CoordinationResDTO.builder()
                .id("c1").title("Meet").mode("oneTime").status("active")
                .dates(List.of("2025-03-10")).startHour(9).endHour(18).build();
        when(service.getByGroupId("user1", "g1", "active")).thenReturn(List.of(dto));

        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Meet"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /coordinations/{id} — 상세 200")
    void getDetail_returns200() throws Exception {
        CoordinationDetailResDTO dto = CoordinationDetailResDTO.builder()
                .id("c1").title("Meet").heatmap(List.of()).build();
        when(service.getDetail("user1", "g1", "c1")).thenReturn(dto);

        mockMvc.perform(get(BASE + "/c1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("c1"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /coordinations — 생성 201")
    void create_returns201() throws Exception {
        CoordinationCreateReqDTO req = new CoordinationCreateReqDTO();
        req.setTitle("Meet"); req.setMode("oneTime");
        req.setDates(List.of("2025-03-10")); req.setStartHour(9); req.setEndHour(18);

        CoordinationResDTO res = CoordinationResDTO.builder().id("c1").title("Meet").build();
        when(service.create(eq("user1"), eq("g1"), any())).thenReturn(res);

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /coordinations — 필수 필드 누락 400")
    void create_invalid_returns400() throws Exception {
        CoordinationCreateReqDTO req = new CoordinationCreateReqDTO(); // empty

        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("PUT /coordinations/{id}/responses/me — 응답 제출 200")
    void submitResponses_returns200() throws Exception {
        CoordinationSubmitReqDTO req = new CoordinationSubmitReqDTO();
        req.setSlots(List.of());

        SubmitResultDTO res = SubmitResultDTO.builder().submittedCount(0).build();
        when(service.submitResponses(eq("user1"), eq("g1"), eq("c1"), any())).thenReturn(res);

        mockMvc.perform(put(BASE + "/c1/responses/me").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.submittedCount").value(0));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /coordinations/{id}/responses/me — 내 응답 조회")
    void getMyResponses_returns200() throws Exception {
        MyResponsesResultDTO res = MyResponsesResultDTO.builder().slots(List.of()).build();
        when(service.getMyResponses("user1", "g1", "c1")).thenReturn(res);

        mockMvc.perform(get(BASE + "/c1/responses/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slots").isArray());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("DELETE /coordinations/{id}/responses/me — 내 응답 삭제 204")
    void deleteMyResponses_returns204() throws Exception {
        doNothing().when(service).deleteMyResponses("user1", "g1", "c1");

        mockMvc.perform(delete(BASE + "/c1/responses/me").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("DELETE /coordinations/{id} — 삭제 204")
    void delete_returns204() throws Exception {
        doNothing().when(service).delete("user1", "g1", "c1");

        mockMvc.perform(delete(BASE + "/c1").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
