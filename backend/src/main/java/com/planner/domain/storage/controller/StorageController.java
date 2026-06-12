package com.planner.domain.storage.controller;

import com.planner.domain.storage.dto.ImageUploadResDTO;
import com.planner.domain.storage.dto.PresignImageUploadReqDTO;
import com.planner.domain.storage.dto.PresignImageUploadResDTO;
import com.planner.domain.storage.service.StorageService;
import com.planner.global.response.CustomResponse;
import com.planner.global.security.AuthUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/planner/v1/storage")
@RequiredArgsConstructor
public class StorageController {

    private final StorageService storageService;

    @PostMapping("/images/presign")
    public ResponseEntity<CustomResponse<PresignImageUploadResDTO>> createPresignedImageUpload(
            @Valid @RequestBody PresignImageUploadReqDTO req) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(storageService.createPresignedUpload(userId, req)));
    }

    @GetMapping("/images/{imageId}")
    public ResponseEntity<CustomResponse<ImageUploadResDTO>> getImageUpload(@PathVariable String imageId) {
        String userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(CustomResponse.ok(storageService.getImageUpload(userId, imageId)));
    }

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
