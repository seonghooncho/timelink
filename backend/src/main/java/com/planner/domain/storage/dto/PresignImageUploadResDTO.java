package com.planner.domain.storage.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class PresignImageUploadResDTO {
    private String imageId;
    private String uploadKey;
    private String uploadUrl;
    private String method;
    private Map<String, String> headers;
    private Long maxSizeBytes;
    private String status;
}
