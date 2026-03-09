package com.planner.domain.storage.service;

import com.planner.domain.storage.dto.ImageUploadResDTO;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    @Mock
    private S3Client s3Client;

    private StorageService storageService;

    @BeforeEach
    void setUp() {
        AwsProperties awsProperties = new AwsProperties();
        awsProperties.setRegion("ap-northeast-2");
        awsProperties.getS3().setBucketName("planner-public-assets-prod");
        storageService = new StorageService(s3Client, awsProperties);
    }

    @Test
    @DisplayName("프로필 이미지는 S3에 업로드되고 공개 URL을 반환한다")
    void uploadProfileImage_returnsPublicUrl() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "image-content".getBytes()
        );

        ImageUploadResDTO result = storageService.uploadProfileImage("user-1", file);

        assertThat(result.getObjectKey()).startsWith("profile/user-1/");
        assertThat(result.getUrl()).startsWith("https://planner-public-assets-prod.s3.ap-northeast-2.amazonaws.com/profile/user-1/");
        then(s3Client).should().putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("이미지가 아닌 파일은 거부한다")
    void uploadProfileImage_rejectsNonImage() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "hello".getBytes()
        );

        assertThatThrownBy(() -> storageService.uploadProfileImage("user-1", file))
                .isInstanceOf(CustomException.class)
                .hasMessage("이미지 파일만 업로드 가능합니다");
    }
}
