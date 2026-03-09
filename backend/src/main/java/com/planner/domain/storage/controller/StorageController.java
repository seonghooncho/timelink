package com.planner.domain.storage.controller;

import com.planner.domain.storage.dto.ImageUploadResDTO;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/planner/v1/storage")
@RequiredArgsConstructor
public class StorageController {

    private final StorageService storageService;

    @PostMapping(value = "/images/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomResponse<ImageUploadResDTO>> uploadProfileImage(
            @RequestPart("file") MultipartFile file) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(storageService.uploadProfileImage(userId, file)));
    }

    @PostMapping(value = "/images/group", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomResponse<ImageUploadResDTO>> uploadGroupImage(
            @RequestPart("file") MultipartFile file) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(storageService.uploadGroupImage(userId, file)));
    }
}
