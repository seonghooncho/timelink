package com.planner.domain.notification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.notification.dto.res.NotificationResDTO;
import com.planner.domain.notification.service.NotificationService;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
@Import(GlobalExceptionHandler.class)
class NotificationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private NotificationService service;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/notifications";

    @Test
    @DisplayName("GET /notifications — 인증 없으면 401")
    void getAll_unauthenticated() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /notifications — 전체 조회 200")
    void getAll_returns200() throws Exception {
        NotificationResDTO dto = NotificationResDTO.builder()
                .id("n1").type("schedule").title("Reminder").isRead(false).build();
        when(service.getAll("user1", null, null)).thenReturn(List.of(dto));

        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Reminder"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /notifications?type=schedule&isRead=false — 필터링")
    void getAll_withFilters() throws Exception {
        when(service.getAll("user1", "schedule", false)).thenReturn(List.of());

        mockMvc.perform(get(BASE).param("type", "schedule").param("isRead", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("PATCH /notifications/{id}/read — 읽음 처리 200")
    void markRead_returns200() throws Exception {
        doNothing().when(service).markRead("user1", "n1");

        mockMvc.perform(patch(BASE + "/n1/read").with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("PATCH /notifications/read-all — 전체 읽음 200")
    void markAllRead_returns200() throws Exception {
        when(service.markAllRead("user1")).thenReturn(Map.of("updated", 5));

        mockMvc.perform(patch(BASE + "/read-all").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updated").value(5));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("DELETE /notifications/{id} — 삭제 204")
    void delete_returns204() throws Exception {
        doNothing().when(service).delete("user1", "n1");

        mockMvc.perform(delete(BASE + "/n1").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
