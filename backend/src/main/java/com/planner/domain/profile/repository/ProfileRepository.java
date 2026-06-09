package com.planner.domain.profile.repository;

import com.planner.domain.profile.model.Profile;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.BatchGetItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.ReadBatch;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ProfileRepository {

    private static final int BATCH_GET_LIMIT = 100;
    private static final String USER_PK_PREFIX = "USER#";

    private final DynamoDbEnhancedClient client;
    private final DynamoDbTable<Profile> table;

    public ProfileRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.client = client;
        this.table = client.table(prefix + "main", TableSchema.fromBean(Profile.class));
    }

    public void save(Profile profile) {
        table.putItem(profile);
    }

    public Optional<Profile> findByUserId(String userId) {
        var key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue("PROFILE")
                .build();
        return Optional.ofNullable(table.getItem(key));
    }

    public Map<String, Profile> findByUserIds(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }

        List<String> distinctUserIds = userIds.stream()
                .filter(userId -> userId != null && !userId.isBlank())
                .distinct()
                .toList();
        if (distinctUserIds.isEmpty()) {
            return Map.of();
        }

        Map<String, Profile> profilesByUserId = new HashMap<>();
        for (int start = 0; start < distinctUserIds.size(); start += BATCH_GET_LIMIT) {
            List<String> batchUserIds = distinctUserIds.subList(start, Math.min(start + BATCH_GET_LIMIT, distinctUserIds.size()));
            ReadBatch.Builder<Profile> readBatch = ReadBatch.builder(Profile.class)
                    .mappedTableResource(table);

            batchUserIds.forEach(userId -> readBatch.addGetItem(Key.builder()
                    .partitionValue(USER_PK_PREFIX + userId)
                    .sortValue("PROFILE")
                    .build()));

            client.batchGetItem(BatchGetItemEnhancedRequest.builder()
                            .readBatches(readBatch.build())
                            .build())
                    .resultsForTable(table)
                    .forEach(profile -> profilesByUserId.put(toUserId(profile.getId()), profile));
        }

        return profilesByUserId;
    }

    private String toUserId(String profileId) {
        if (profileId != null && profileId.startsWith(USER_PK_PREFIX)) {
            return profileId.substring(USER_PK_PREFIX.length());
        }
        return profileId;
    }
}
