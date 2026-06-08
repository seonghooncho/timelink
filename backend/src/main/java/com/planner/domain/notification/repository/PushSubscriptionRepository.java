package com.planner.domain.notification.repository;

import com.planner.domain.notification.model.PushSubscription;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class PushSubscriptionRepository {

    private final DynamoDbTable<PushSubscription> table;

    public PushSubscriptionRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.table = client.table(prefix + "main", TableSchema.fromBean(PushSubscription.class));
    }

    public void save(PushSubscription subscription) {
        table.putItem(subscription);
    }

    public List<PushSubscription> findByUserId(String userId) {
        return table.query(r -> r.queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("USER#" + userId).sortValue("PUSH_SUB#")
                )))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    public Optional<PushSubscription> findByEndpoint(String userId, String endpoint) {
        String id = idFromEndpoint(endpoint);
        Key key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue("PUSH_SUB#" + id)
                .build();
        return Optional.ofNullable(table.getItem(key));
    }

    public void deleteByEndpoint(String userId, String endpoint) {
        String id = idFromEndpoint(endpoint);
        deleteBySk(userId, "PUSH_SUB#" + id);
    }

    public void deleteBySk(String userId, String sk) {
        Key key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue(sk)
                .build();
        table.deleteItem(key);
    }

    public static String idFromEndpoint(String endpoint) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(endpoint.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다", e);
        }
    }
}
