package com.planner.domain.storage.service;

import com.planner.domain.storage.dto.ImageUploadResDTO;
import com.planner.domain.storage.dto.PresignImageUploadReqDTO;
import com.planner.domain.storage.model.ImageStatus;
import com.planner.domain.storage.repository.ImageUploadRepository;
import com.planner.global.config.AwsProperties;
import com.planner.global.error.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.net.MalformedURLException;
import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    private static final long MAX_IMAGE_SIZE_BYTES = 15L * 1024 * 1024;

    @Mock
    private S3Client s3Client;
    @Mock
    private S3Presigner s3Presigner;
    @Mock
    private ImageUploadRepository imageUploadRepository;

    private StorageService storageService;

    @BeforeEach
    void setUp() {
        AwsProperties awsProperties = new AwsProperties();
        awsProperties.setRegion("ap-northeast-2");
        awsProperties.getS3().setBucketName("planner-public-assets-prod");
        storageService = new StorageService(s3Client, s3Presigner, awsProperties, imageUploadRepository);
    }

    @Test
    @DisplayName("legacy multipart 프로필 이미지는 S3에 업로드되고 공개 URL을 반환한다")
    void legacyUploadProfileImage_returnsPublicUrl() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "image-content".getBytes()
        );

        ImageUploadResDTO result = storageService.uploadProfileImage("user-1", file);

        assertThat(result.getObjectKey()).startsWith("uploads/profile/user-1/");
        assertThat(result.getUrl()).startsWith("https://planner-public-assets-prod.s3.ap-northeast-2.amazonaws.com/uploads/profile/user-1/");
        then(s3Client).should().putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("legacy multipart 업로드는 이미지가 아닌 파일을 거부한다")
    void legacyUploadProfileImage_rejectsNonImage() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "hello".getBytes()
        );

        assertThatThrownBy(() -> storageService.uploadProfileImage("user-1", file))
                .isInstanceOf(CustomException.class)
                .hasMessage("jpg, png, webp 이미지만 업로드 가능합니다");
    }

    @Test
    @DisplayName("presigned 업로드는 upload/member prefix와 처리 중 상태를 반환한다")
    void createPresignedUpload_returnsProcessingUpload() throws MalformedURLException {
        PresignImageUploadReqDTO req = new PresignImageUploadReqDTO();
        req.setPurpose("MEMBER");
        req.setFileName("avatar.jpeg");
        req.setContentType("image/jpeg");
        req.setContentLength(1024L);

        PresignedPutObjectRequest presigned = org.mockito.Mockito.mock(PresignedPutObjectRequest.class);
        org.mockito.BDDMockito.given(presigned.url()).willReturn(URI.create("https://upload.test/member").toURL());
        org.mockito.BDDMockito.given(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).willReturn(presigned);

        var result = storageService.createPresignedUpload("user-1", req);

        assertThat(result.getUploadKey()).startsWith("upload/member/user-1/");
        assertThat(result.getUploadKey()).endsWith("/original.jpg");
        assertThat(result.getMethod()).isEqualTo("PUT");
        assertThat(result.getMaxSizeBytes()).isEqualTo(MAX_IMAGE_SIZE_BYTES);
        assertThat(result.getStatus()).isEqualTo(ImageStatus.PROCESSING.name());
        assertThat(result.getHeaders()).containsEntry("Content-Type", "image/jpeg");
        assertThat(result.getHeaders()).containsEntry("x-amz-meta-purpose", "MEMBER");
        then(imageUploadRepository).should().save(argThat(upload ->
                "user-1".equals(upload.getOwnerUserId())
                        && ImageStatus.PROCESSING.name().equals(upload.getStatus())
                        && "MEMBER".equals(upload.getPurpose())
                        && "user-1".equals(upload.getTargetId())
                        && upload.getUploadKey().startsWith("upload/member/user-1/")
        ));
    }

    @Test
    @DisplayName("presigned 업로드는 15MB 초과 이미지를 거부한다")
    void createPresignedUpload_rejectsOversizedImage() {
        PresignImageUploadReqDTO req = new PresignImageUploadReqDTO();
        req.setPurpose("MEMBER");
        req.setFileName("avatar.png");
        req.setContentType("image/png");
        req.setContentLength(MAX_IMAGE_SIZE_BYTES + 1);

        assertThatThrownBy(() -> storageService.createPresignedUpload("user-1", req))
                .isInstanceOf(CustomException.class)
                .hasMessage("15MB 이하의 이미지만 업로드 가능합니다");
        then(imageUploadRepository).shouldHaveNoInteractions();
        then(s3Presigner).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("presigned 업로드는 지원하지 않는 이미지 타입을 거부한다")
    void createPresignedUpload_rejectsUnsupportedContentType() {
        PresignImageUploadReqDTO req = new PresignImageUploadReqDTO();
        req.setPurpose("MEMBER");
        req.setFileName("avatar.gif");
        req.setContentType("image/gif");
        req.setContentLength(1024L);

        assertThatThrownBy(() -> storageService.createPresignedUpload("user-1", req))
                .isInstanceOf(CustomException.class)
                .hasMessage("jpg, png, webp 이미지만 업로드 가능합니다");
        then(imageUploadRepository).shouldHaveNoInteractions();
        then(s3Presigner).shouldHaveNoInteractions();
    }
}
