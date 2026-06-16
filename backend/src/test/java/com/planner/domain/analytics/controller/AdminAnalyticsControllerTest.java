package com.planner.domain.analytics.controller;

import com.planner.domain.analytics.dto.AdminMeResDTO;
import com.planner.domain.analytics.dto.AnalyticsSummaryResDTO;
import com.planner.domain.analytics.service.AnalyticsAdminService;
import com.planner.global.config.JwtProperties;
import com.planner.global.error.GlobalExceptionHandler;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminAnalyticsController.class)
@Import(GlobalExceptionHandler.class)
class AdminAnalyticsControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private AnalyticsAdminService service;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

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
    @DisplayName("GET /admin/analytics/summary 는 인증 없으면 401")
    void summary_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/planner/v1/admin/analytics/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin-user")
    @DisplayName("GET /admin/me 는 관리자 계정 정보를 반환한다")
    void me_returnsAdminIdentity() throws Exception {
        when(service.getMe("admin-user"))
                .thenReturn(AdminMeResDTO.builder()
                        .admin(true)
                        .userId("admin-user")
                        .build());

        mockMvc.perform(get("/api/planner/v1/admin/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.admin").value(true))
                .andExpect(jsonPath("$.data.userId").value("admin-user"));
    }

    @Test
    @WithMockUser(username = "admin-user")
    @DisplayName("GET /admin/analytics/summary 는 summary를 반환한다")
    void summary_returnsMetrics() throws Exception {
        when(service.getSummary("admin-user", "2026-06-16"))
                .thenReturn(AnalyticsSummaryResDTO.builder()
                        .date("2026-06-16")
                        .totalUsers(10)
                        .todayActiveUsers(3)
                        .topFeatures(List.of())
                        .apiPerformance(List.of(AnalyticsSummaryResDTO.ApiPerformanceDTO.builder()
                                .method("GET")
                                .route("/api/planner/v1/groups")
                                .count(12)
                                .p50Ms(100)
                                .p95Ms(800)
                                .build()))
                        .recentErrors(List.of())
                        .build());

        mockMvc.perform(get("/api/planner/v1/admin/analytics/summary")
                        .param("date", "2026-06-16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalUsers").value(10))
                .andExpect(jsonPath("$.data.todayActiveUsers").value(3))
                .andExpect(jsonPath("$.data.apiPerformance[0].route").value("/api/planner/v1/groups"))
                .andExpect(jsonPath("$.data.apiPerformance[0].p95Ms").value(800));
    }
}
