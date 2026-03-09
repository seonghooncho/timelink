package com.planner.domain.storage.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImageUploadResDTO {
    private String objectKey;
    private String url;
}
