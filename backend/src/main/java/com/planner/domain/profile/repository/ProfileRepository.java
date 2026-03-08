package com.planner.domain.profile.repository;

import com.planner.domain.profile.model.Profile;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;

import java.util.Optional;

@Repository
public class ProfileRepository {

    private final DynamoDbTable<Profile> table;

    public ProfileRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
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
}
