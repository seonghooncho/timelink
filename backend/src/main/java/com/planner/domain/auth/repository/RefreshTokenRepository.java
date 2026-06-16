package com.planner.domain.auth.repository;

import com.planner.global.config.AwsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepository {

    private final DynamoDbClient dynamoDbClient;
    private final AwsProperties awsProperties;

    public void save(String userId, String tokenId, String tokenHash, String expiresAt, long ttl, String updatedAt) {
        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(tableName())
                .item(Map.of(
                        "PK", s(pk(userId)),
                        "SK", s(sk(tokenId)),
                        "tokenId", s(tokenId),
                        "tokenHash", s(tokenHash),
                        "expiresAt", s(expiresAt),
                        "ttl", n(ttl),
                        "updatedAt", s(updatedAt)
                ))
                .build());
    }

    public Optional<StoredRefreshToken> findByUserIdAndTokenId(String userId, String tokenId) {
        var response = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(tableName())
                .key(Map.of(
                        "PK", s(pk(userId)),
                        "SK", s(sk(tokenId))
                ))
                .consistentRead(true)
                .build());

        Map<String, AttributeValue> item = response.item();
        if (item == null || item.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(new StoredRefreshToken(
                value(item, "tokenId"),
                value(item, "tokenHash"),
                value(item, "expiresAt"),
                longValue(item, "ttl")
        ));
    }

    public void deleteByUserIdAndTokenId(String userId, String tokenId) {
        dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                .tableName(tableName())
                .key(Map.of(
                        "PK", s(pk(userId)),
                        "SK", s(sk(tokenId))
                ))
                .build());
    }

    private String tableName() {
        return awsProperties.getDynamodb().getTablePrefix() + "main";
    }

    private String pk(String userId) {
        return "AUTH#REFRESH#" + userId;
    }

    private String sk(String tokenId) {
        return "TOKEN#" + tokenId;
    }

    private AttributeValue s(String value) {
        return AttributeValue.builder().s(value == null ? "" : value).build();
    }

    private AttributeValue n(long value) {
        return AttributeValue.builder().n(Long.toString(value)).build();
    }

    private String value(Map<String, AttributeValue> item, String key) {
        AttributeValue value = item.get(key);
        return value == null ? "" : value.s();
    }

    private long longValue(Map<String, AttributeValue> item, String key) {
        AttributeValue value = item.get(key);
        if (value == null || value.n() == null || value.n().isBlank()) {
            return 0L;
        }
        return Long.parseLong(value.n());
    }

    public record StoredRefreshToken(String tokenId, String tokenHash, String expiresAt, long ttl) {
    }
}
