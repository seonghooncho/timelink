package com.planner.domain.community.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.community.dto.CommunityPostResDTO;
import com.planner.domain.community.service.CommunityService;
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
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommunityController.class)
@Import(GlobalExceptionHandler.class)
class CommunityControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private CommunityService service;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/community/posts";

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
    @WithMockUser(username = "user1")
    @DisplayName("GET /community/posts — limit은 서비스 보정값으로 조회한다")
    void getPosts_usesResolvedLimit() throws Exception {
        CursorPageResult<CommunityPostResDTO> page = CursorPageResult.<CommunityPostResDTO>builder()
                .items(List.of(CommunityPostResDTO.builder().id("p1").title("글").build()))
                .build();
        when(service.resolveLimit(200)).thenReturn(100);
        when(service.getPosts("user1", 100, "cursor-1")).thenReturn(page);
        when(service.toPageMeta(page, 100)).thenReturn(CustomResponse.PageMeta.builder().perPage(100).build());

        mockMvc.perform(get(BASE)
                        .param("limit", "200")
                        .param("cursor", "cursor-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.perPage").value(100));

        verify(service).getPosts("user1", 100, "cursor-1");
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /community/posts — 제목과 본문 최대 길이를 넘으면 400")
    void createPost_rejectsOverlongText() throws Exception {
        mockMvc.perform(post(BASE).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "가".repeat(41),
                                "content", "나".repeat(2001)
                        ))))
                .andExpect(status().isBadRequest());

        verify(service, never()).createPost(anyString(), any());
    }

    @Test
    @WithMockUser(username = "user1")
    @DisplayName("POST /community/posts/{postId}/comments — 댓글 최대 길이를 넘으면 400")
    void createComment_rejectsOverlongText() throws Exception {
        mockMvc.perform(post(BASE + "/p1/comments").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "content", "다".repeat(501)
                        ))))
                .andExpect(status().isBadRequest());

        verify(service, never()).createComment(anyString(), anyString(), any());
    }
}
