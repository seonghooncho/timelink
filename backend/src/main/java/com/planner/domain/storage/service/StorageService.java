package com.planner.domain.storage.service;

import com.planner.domain.storage.dto.ImageUploadResDTO;
import com.planner.global.config.AwsProperties;
import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageService {

    private static final long MAX_IMAGE_SIZE_BYTES = 5L * 1024 * 1024;

    private final S3Client s3Client;
    private final AwsProperties awsProperties;

    public ImageUploadResDTO uploadProfileImage(String userId, MultipartFile file) {
        return uploadImage(userId, "profile", file);
    }

    public ImageUploadResDTO uploadGroupImage(String userId, MultipartFile file) {
        return uploadImage(userId, "group", file);
    }

    private ImageUploadResDTO uploadImage(String userId, String category, MultipartFile file) {
        validateFile(file);

        String bucketName = awsProperties.getS3().getBucketName();
        if (!StringUtils.hasText(bucketName)) {
            throw new CustomException(GeneralErrorCode.INTERNAL_ERROR, "S3 버킷 설정이 없습니다");
        }

        String extension = extractExtension(file.getOriginalFilename());
        String objectKey = "uploads/%s/%s/%s.%s".formatted(category, userId, UUID.randomUUID(), extension);

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(file.getContentType())
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new CustomException(GeneralErrorCode.INTERNAL_ERROR, "업로드 파일을 읽는 중 오류가 발생했습니다");
        } catch (S3Exception e) {
            throw new CustomException(GeneralErrorCode.INTERNAL_ERROR, "이미지 업로드에 실패했습니다");
        }

        return ImageUploadResDTO.builder()
                .objectKey(objectKey)
                .url(buildPublicUrl(bucketName, objectKey))
                .build();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "업로드 파일이 비어 있습니다");
        }
        if (!StringUtils.hasText(file.getContentType()) || !file.getContentType().startsWith("image/")) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지 파일만 업로드 가능합니다");
        }
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "5MB 이하의 이미지만 업로드 가능합니다");
        }
    }

    private String extractExtension(String originalFilename) {
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            return "png";
        }

        String ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
                .toLowerCase(Locale.ROOT);
        return ext.isBlank() ? "png" : ext;
    }

    private String buildPublicUrl(String bucketName, String objectKey) {
        String publicBaseUrl = awsProperties.getS3().getPublicBaseUrl();
        if (StringUtils.hasText(publicBaseUrl)) {
            return publicBaseUrl.endsWith("/")
                    ? publicBaseUrl + objectKey
                    : publicBaseUrl + "/" + objectKey;
        }

        return "https://%s.s3.%s.amazonaws.com/%s"
                .formatted(bucketName, awsProperties.getRegion(), objectKey);
    }
}
