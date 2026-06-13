package com.planner.domain.storage.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImageUploadResDTO {
    private String imageId;
    private String objectKey;
    private String uploadKey;
    private String publicKey;
    private String thumbnailKey;
    private String thumbnailUrl;
    private String url;
    private String status;
    private String failureReason;
}
