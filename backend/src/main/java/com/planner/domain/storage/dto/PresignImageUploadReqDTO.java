package com.planner.domain.storage.dto;

import lombok.Data;

@Data
public class PresignImageUploadReqDTO {
    private String purpose;
    private String fileName;
    private String contentType;
    private Long contentLength;
    private String targetId;
}
