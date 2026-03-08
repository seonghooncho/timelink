package com.planner.domain.profile.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.profile.dto.req.ProfileUpdateReqDTO;
import com.planner.domain.profile.dto.res.ProfileResDTO;
import com.planner.domain.profile.service.ProfileService;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProfileController.class)
@Import(GlobalExceptionHandler.class)
class ProfileControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private ProfileService service;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/profiles";

    private ProfileResDTO sampleProfile() {
        return ProfileResDTO.builder()
                .id("user1").nickname("John").avatarUrl("https://img.test/a.png").build();
    }

    @Test
    @DisplayName("GET /profiles/me — 인증 없으면 401")
    void getMyProfile_unauthenticated() throws Exception {
        mockMvc.perform(get(BASE + "/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("GET /profiles/me — 프로필 조회 200")
    void getMyProfile_returns200() throws Exception {
        when(service.getOrCreate("user1")).thenReturn(sampleProfile());

        mockMvc.perform(get(BASE + "/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("John"));
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("PATCH /profiles/me — 프로필 수정 200")
    void updateMyProfile_returns200() throws Exception {
        ProfileUpdateReqDTO req = new ProfileUpdateReqDTO();
        req.setNickname("Jane");

        when(service.update(eq("user1"), any())).thenReturn(
                ProfileResDTO.builder().id("user1").nickname("Jane").build());

        mockMvc.perform(patch(BASE + "/me").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("Jane"));
    }
}
