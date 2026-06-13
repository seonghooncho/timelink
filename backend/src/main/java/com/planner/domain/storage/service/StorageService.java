package com.planner.domain.storage.service;

import com.planner.domain.storage.dto.ImageUploadResDTO;
import com.planner.domain.storage.dto.PresignImageUploadReqDTO;
import com.planner.domain.storage.dto.PresignImageUploadResDTO;
import com.planner.domain.storage.model.ImagePurpose;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.model.ImageUpload;
import com.planner.domain.storage.repository.ImageUploadRepository;
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
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * 이미지 업로드의 presigned URL 발급과 업로드 메타데이터 관리를 맡는다.
 */
@Service
@RequiredArgsConstructor
public class StorageService {

    private static final long MAX_IMAGE_SIZE_BYTES = 15L * 1024 * 1024;
    private static final Duration PRESIGNED_UPLOAD_TTL = Duration.ofMinutes(10);
    private static final Map<String, String> ALLOWED_IMAGE_TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final AwsProperties awsProperties;
    private final ImageUploadRepository imageUploadRepository;

    public PresignImageUploadResDTO createPresignedUpload(String userId, PresignImageUploadReqDTO req) {
        validatePresignRequest(req);
        ImagePurpose purpose = ImagePurpose.from(req.getPurpose());

        String bucketName = resolveBucketName();
        String imageId = UUID.randomUUID().toString();
        String targetId = resolveInitialTargetId(userId, purpose, req.getTargetId());
        String uploadKey = buildUploadKey(userId, purpose, imageId, req.getFileName(), req.getContentType());
        String now = Instant.now().toString();

        ImageUpload upload = ImageUpload.builder()
                .pk("IMAGE#" + imageId)
                .sk("METADATA")
                .imageId(imageId)
                .ownerUserId(userId)
                .purpose(purpose.name())
                .targetId(targetId)
                .status(ImageStatus.PROCESSING.name())
                .uploadKey(uploadKey)
                .contentType(req.getContentType())
                .contentLength(req.getContentLength())
                .originalFilename(req.getFileName())
                .createdAt(now)
                .updatedAt(now)
                .build();
        imageUploadRepository.save(upload);

        // Lambda가 S3 이벤트만 보고도 대상과 용도를 찾을 수 있게 메타데이터를 같이 서명한다.
        Map<String, String> metadata = buildUploadMetadata(imageId, purpose, userId, targetId);
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(uploadKey)
                .contentType(req.getContentType())
                .contentLength(req.getContentLength())
                .metadata(metadata)
                .build();
        var presigned = s3Presigner.presignPutObject(PutObjectPresignRequest.builder()
                .signatureDuration(PRESIGNED_UPLOAD_TTL)
                .putObjectRequest(request)
                .build());

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", req.getContentType());
        metadata.forEach((key, value) -> headers.put("x-amz-meta-" + key, value));

        return PresignImageUploadResDTO.builder()
                .imageId(imageId)
                .uploadKey(uploadKey)
                .uploadUrl(presigned.url().toString())
                .method("PUT")
                .headers(headers)
                .maxSizeBytes(MAX_IMAGE_SIZE_BYTES)
                .status(ImageStatus.PROCESSING.name())
                .build();
    }

    public ImageUploadResDTO getImageUpload(String userId, String imageId) {
        ImageUpload upload = findOwnedImageUpload(userId, imageId);
        return toResponse(upload);
    }

    public ImageUpload attachImageToTarget(String userId, String imageId, ImagePurpose expectedPurpose, String targetId) {
        if (!StringUtils.hasText(imageId)) {
            return null;
        }
        if (!StringUtils.hasText(targetId)) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지를 연결할 대상이 없습니다");
        }

        ImageUpload upload = findOwnedImageUpload(userId, imageId);
        if (!expectedPurpose.name().equals(upload.getPurpose())) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지 용도와 연결 대상이 맞지 않습니다");
        }

        // 생성 시점에 targetId가 없던 그룹/일정 이미지는 실제 대상 생성 후 여기서 연결한다.
        String now = Instant.now().toString();
        imageUploadRepository.attachTarget(imageId, targetId, now);
        upload.setTargetId(targetId);
        upload.setUpdatedAt(now);
        return upload;
    }

    @Deprecated(since = "2026-06-13", forRemoval = false)
    public ImageUploadResDTO uploadProfileImage(String userId, MultipartFile file) {
        return uploadImage(userId, "profile", file);
    }

    @Deprecated(since = "2026-06-13", forRemoval = false)
    public ImageUploadResDTO uploadGroupImage(String userId, MultipartFile file) {
        return uploadImage(userId, "group", file);
    }

    private ImageUploadResDTO uploadImage(String userId, String category, MultipartFile file) {
        validateFile(file);

        String bucketName = resolveBucketName();

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
                .status(ImageStatus.COMPLETED.name())
                .build();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "업로드 파일이 비어 있습니다");
        }
        validateContentType(file.getContentType());
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "15MB 이하의 이미지만 업로드 가능합니다");
        }
    }

    private void validatePresignRequest(PresignImageUploadReqDTO req) {
        if (req == null) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "업로드 정보를 입력해주세요");
        }
        validateContentType(req.getContentType());
        if (req.getContentLength() == null || req.getContentLength() <= 0) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지 크기를 확인할 수 없습니다");
        }
        if (req.getContentLength() > MAX_IMAGE_SIZE_BYTES) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "15MB 이하의 이미지만 업로드 가능합니다");
        }
    }

    private void validateContentType(String contentType) {
        if (!StringUtils.hasText(contentType) || !ALLOWED_IMAGE_TYPES.containsKey(contentType.toLowerCase(Locale.ROOT))) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "jpg, png, webp 이미지만 업로드 가능합니다");
        }
    }

    private ImageUpload findOwnedImageUpload(String userId, String imageId) {
        ImageUpload upload = imageUploadRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(GeneralErrorCode.BAD_REQUEST, "이미지 업로드 정보를 찾을 수 없습니다"));
        if (!userId.equals(upload.getOwnerUserId())) {
            throw new CustomException(GeneralErrorCode.FORBIDDEN, "이미지 업로드 권한이 없습니다");
        }
        return upload;
    }

    private String resolveInitialTargetId(String userId, ImagePurpose purpose, String requestedTargetId) {
        if (purpose == ImagePurpose.MEMBER) {
            return userId;
        }
        return StringUtils.hasText(requestedTargetId) ? requestedTargetId.trim() : null;
    }

    private String buildUploadKey(String userId, ImagePurpose purpose, String imageId, String fileName, String contentType) {
        String extension = extractAllowedExtension(fileName, contentType);
        return "upload/%s/%s/%s/original.%s".formatted(purpose.prefix(), sanitizePathPart(userId), imageId, extension);
    }

    private Map<String, String> buildUploadMetadata(String imageId, ImagePurpose purpose, String userId, String targetId) {
        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("image-id", imageId);
        metadata.put("purpose", purpose.name());
        metadata.put("owner-user-id", userId);
        if (StringUtils.hasText(targetId)) {
            metadata.put("target-id", targetId);
        }
        return metadata;
    }

    private String extractAllowedExtension(String fileName, String contentType) {
        String extension = extractExtension(fileName);
        if ("jpeg".equals(extension)) {
            extension = "jpg";
        }

        String expected = ALLOWED_IMAGE_TYPES.get(contentType.toLowerCase(Locale.ROOT));
        if ("jpg".equals(expected) && ("jpg".equals(extension) || "jpeg".equals(extension))) {
            return "jpg";
        }
        if (expected.equals(extension)) {
            return extension;
        }
        return expected;
    }

    private String extractExtension(String originalFilename) {
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            return "png";
        }

        String ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
                .toLowerCase(Locale.ROOT);
        return ext.isBlank() ? "png" : ext;
    }

    private String sanitizePathPart(String value) {
        return value == null ? "unknown" : value.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String resolveBucketName() {
        String bucketName = awsProperties.getS3().getBucketName();
        if (!StringUtils.hasText(bucketName)) {
            throw new CustomException(GeneralErrorCode.INTERNAL_ERROR, "S3 버킷 설정이 없습니다");
        }
        return bucketName;
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

    private ImageUploadResDTO toResponse(ImageUpload upload) {
        return ImageUploadResDTO.builder()
                .imageId(upload.getImageId())
                .objectKey(upload.getPublicKey())
                .uploadKey(upload.getUploadKey())
                .publicKey(upload.getPublicKey())
                .url(upload.getPublicUrl())
                .status(upload.getStatus())
                .failureReason(upload.getFailureReason())
                .build();
    }
}
