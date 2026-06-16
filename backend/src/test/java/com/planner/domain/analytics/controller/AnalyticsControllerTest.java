package com.planner.domain.analytics.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.analytics.dto.AnalyticsTrackReqDTO;
import com.planner.domain.analytics.dto.AnalyticsTrackResDTO;
import com.planner.domain.analytics.service.AnalyticsService;
import com.planner.global.config.CorsProperties;
import com.planner.global.config.JwtProperties;
import com.planner.global.config.SecurityConfig;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@Import({GlobalExceptionHandler.class, SecurityConfig.class})
class AnalyticsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AnalyticsService service;
    @MockBean private CorsProperties corsProperties;
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
    @DisplayName("POST /analytics/track 은 익명 page_view도 수락한다")
    void track_acceptsAnonymous() throws Exception {
        AnalyticsTrackReqDTO req = new AnalyticsTrackReqDTO();
        req.setEventName("page_view");
        req.setProperties(Map.of("route", "/demo", "feature", "demo"));

        when(service.track(isNull(), any()))
                .thenReturn(AnalyticsTrackResDTO.builder().accepted(true).eventId("event-1").build());

        mockMvc.perform(post("/api/planner/v1/analytics/track").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.accepted").value(true))
                .andExpect(jsonPath("$.data.eventId").value("event-1"));
    }
}
