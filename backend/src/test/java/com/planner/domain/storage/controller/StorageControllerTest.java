package com.planner.domain.storage.controller;

import com.planner.domain.storage.dto.ImageUploadResDTO;
import com.planner.domain.storage.dto.PresignImageUploadResDTO;
import com.planner.domain.storage.service.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StorageController.class)
@Import(GlobalExceptionHandler.class)
class StorageControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private StorageService storageService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtProperties jwtProperties;

    private static final String BASE = "/api/planner/v1/storage";

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
    @DisplayName("legacy multipart POST /storage/images/profile 는 인증 없으면 401")
    void legacyUploadProfileImage_unauthenticated() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", "img".getBytes());

        mockMvc.perform(multipart(BASE + "/images/profile").file(file).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user-1")
    @DisplayName("legacy multipart POST /storage/images/profile 는 업로드 URL을 반환한다")
    void legacyUploadProfileImage_returns200() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", "img".getBytes());
        when(storageService.uploadProfileImage(eq("user-1"), any())).thenReturn(ImageUploadResDTO.builder()
                .objectKey("profile/user-1/avatar.png")
                .url("https://cdn.test/profile/user-1/avatar.png")
                .build());

        mockMvc.perform(multipart(BASE + "/images/profile").file(file).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.url").value("https://cdn.test/profile/user-1/avatar.png"));
    }

    @Test
    @WithMockUser(username = "user-1")
    @DisplayName("POST /storage/images/presign 은 presigned 업로드 정보를 반환한다")
    void createPresignedImageUpload_returns200() throws Exception {
        when(storageService.createPresignedUpload(eq("user-1"), any())).thenReturn(PresignImageUploadResDTO.builder()
                .imageId("img-1")
                .uploadKey("upload/member/user-1/img-1/original.webp")
                .uploadUrl("https://upload.test/img-1")
                .method("PUT")
                .maxSizeBytes(15L * 1024 * 1024)
                .status("PROCESSING")
                .build());

        mockMvc.perform(post(BASE + "/images/presign")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "purpose", "MEMBER",
                                "fileName", "avatar.webp",
                                "contentType", "image/webp",
                                "contentLength", 1024
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageId").value("img-1"))
                .andExpect(jsonPath("$.data.uploadKey").value("upload/member/user-1/img-1/original.webp"))
                .andExpect(jsonPath("$.data.status").value("PROCESSING"));
    }

    @Test
    @DisplayName("POST /storage/images/presign 은 인증 없으면 401")
    void createPresignedImageUpload_unauthenticated() throws Exception {
        mockMvc.perform(post(BASE + "/images/presign")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "purpose", "MEMBER",
                                "fileName", "avatar.webp",
                                "contentType", "image/webp",
                                "contentLength", 1024
                        ))))
                .andExpect(status().isUnauthorized());
    }
}
