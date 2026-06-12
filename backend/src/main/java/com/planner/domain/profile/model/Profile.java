package com.planner.domain.profile.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean
public class Profile {

    private String id;
    private String sk;
    private String nickname;
    private String avatarUrl;
    private String imageId;
    private String imageStatus;
    private String imageUploadKey;
    private String imageObjectKey;
    private String termsVersion;
    private String termsAgreedAt;
    private String privacyVersion;
    private String privacyAgreedAt;
    private String createdAt;
    private String updatedAt;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getId() { return id; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() { return sk; }
}
