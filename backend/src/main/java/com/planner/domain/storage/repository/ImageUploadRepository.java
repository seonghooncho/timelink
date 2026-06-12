package com.planner.domain.storage.repository;

import com.planner.domain.storage.model.ImageUpload;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Repository
public class ImageUploadRepository {
    private final DynamoDbTable<ImageUpload> table;
    private final DynamoDbClient dynamoDbClient;
    private final String tableName;

    public ImageUploadRepository(DynamoDbEnhancedClient client, DynamoDbClient dynamoDbClient, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.tableName = prefix + "main";
        this.table = client.table(tableName, TableSchema.fromBean(ImageUpload.class));
        this.dynamoDbClient = dynamoDbClient;
    }

    public void save(ImageUpload upload) {
        table.putItem(upload);
    }

    public Optional<ImageUpload> findById(String imageId) {
        var key = Key.builder()
                .partitionValue("IMAGE#" + imageId)
                .sortValue("METADATA")
                .build();
        return Optional.ofNullable(table.getItem(key));
    }

    public void attachTarget(String imageId, String targetId, String updatedAt) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":targetId", AttributeValue.builder().s(targetId).build());
        values.put(":updatedAt", AttributeValue.builder().s(updatedAt).build());

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s("IMAGE#" + imageId).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .updateExpression("SET targetId = :targetId, updatedAt = :updatedAt")
                .expressionAttributeValues(values)
                .build());
    }
}
