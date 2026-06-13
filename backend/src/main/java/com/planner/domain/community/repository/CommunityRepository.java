package com.planner.domain.community.repository;

import com.planner.domain.community.model.CommunityComment;
import com.planner.domain.community.model.CommunityPost;
import com.planner.domain.community.model.CommunityPostLike;
import com.planner.global.config.AwsProperties;
import com.planner.global.cursor.Cursor;
import com.planner.global.cursor.CursorPageResult;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbIndex;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class CommunityRepository {

    private final DynamoDbTable<CommunityPost> postTable;
    private final DynamoDbTable<CommunityComment> commentTable;
    private final DynamoDbTable<CommunityPostLike> likeTable;
    private final DynamoDbIndex<CommunityPost> postListIndex;
    private final DynamoDbClient dynamoDbClient;
    private final String tableName;

    public CommunityRepository(DynamoDbEnhancedClient client, DynamoDbClient dynamoDbClient, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.tableName = prefix + "main";
        this.postTable = client.table(tableName, TableSchema.fromBean(CommunityPost.class));
        this.commentTable = client.table(tableName, TableSchema.fromBean(CommunityComment.class));
        this.likeTable = client.table(tableName, TableSchema.fromBean(CommunityPostLike.class));
        this.postListIndex = postTable.index("GSI5");
        this.dynamoDbClient = dynamoDbClient;
    }

    public void savePost(CommunityPost post) {
        postTable.putItem(post);
    }

    public Optional<CommunityPost> findPost(String postId) {
        var key = Key.builder()
                .partitionValue("POST#" + postId)
                .sortValue("METADATA")
                .build();
        return Optional.ofNullable(postTable.getItem(key));
    }

    public CursorPageResult<CommunityPost> findPostsPaged(int limit, Cursor cursor) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(k -> k.partitionValue("COMMUNITY#POSTS")))
                .scanIndexForward(false);

        if (limit > 0) request.limit(limit);
        if (cursor != null) request.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<CommunityPost>> pages = postListIndex.query(request.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<CommunityPost>builder().items(List.of()).build();
        }

        Page<CommunityPost> page = pages.next();
        return CursorPageResult.<CommunityPost>builder()
                .items(page.items())
                .nextCursor(toCursor(page.lastEvaluatedKey()))
                .build();
    }

    public void deletePostCascade(String postId) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(k -> k.partitionValue("POST#" + postId)))
                .build();
        postTable.query(request).stream()
                .flatMap(page -> page.items().stream())
                .forEach(item -> deleteRaw(item.getPk(), item.getSk()));
    }

    public void saveComment(CommunityComment comment) {
        commentTable.putItem(comment);
    }

    public Optional<CommunityComment> findComment(String postId, String commentId) {
        return findCommentsByPostId(postId).stream()
                .filter(comment -> commentId.equals(comment.getId()))
                .findFirst();
    }

    public CursorPageResult<CommunityComment> findCommentsByPostIdPaged(String postId, int limit, Cursor cursor) {
        var request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("POST#" + postId).sortValue("COMMENT#")
                ))
                .scanIndexForward(true);

        if (limit > 0) request.limit(limit);
        if (cursor != null) request.exclusiveStartKey(toAttributeMap(cursor));

        Iterator<Page<CommunityComment>> pages = commentTable.query(request.build()).iterator();
        if (!pages.hasNext()) {
            return CursorPageResult.<CommunityComment>builder().items(List.of()).build();
        }

        Page<CommunityComment> page = pages.next();
        return CursorPageResult.<CommunityComment>builder()
                .items(page.items())
                .nextCursor(toCursor(page.lastEvaluatedKey()))
                .build();
    }

    public boolean deleteComment(CommunityComment comment) {
        try {
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(comment.getPk()).build(),
                            "SK", AttributeValue.builder().s(comment.getSk()).build()
                    ))
                    .conditionExpression("attribute_exists(PK)")
                    .build());
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false;
        }
    }

    public boolean likePost(String postId, String userId) {
        String now = java.time.Instant.now().toString();
        try {
            dynamoDbClient.putItem(PutItemRequest.builder()
                    .tableName(tableName)
                    .item(Map.of(
                            "PK", AttributeValue.builder().s("POST#" + postId).build(),
                            "SK", AttributeValue.builder().s("LIKE#" + userId).build(),
                            "postId", AttributeValue.builder().s(postId).build(),
                            "userId", AttributeValue.builder().s(userId).build(),
                            "createdAt", AttributeValue.builder().s(now).build()
                    ))
                    .conditionExpression("attribute_not_exists(PK)")
                    .build());
            updatePostCount(postId, "likeCount", 1);
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false;
        }
    }

    public boolean unlikePost(String postId, String userId) {
        try {
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s("POST#" + postId).build(),
                            "SK", AttributeValue.builder().s("LIKE#" + userId).build()
                    ))
                    .conditionExpression("attribute_exists(PK)")
                    .build());
            updatePostCount(postId, "likeCount", -1);
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false;
        }
    }

    public boolean isLikedBy(String postId, String userId) {
        var key = Key.builder()
                .partitionValue("POST#" + postId)
                .sortValue("LIKE#" + userId)
                .build();
        return likeTable.getItem(key) != null;
    }

    public void incrementCommentCount(String postId) {
        updatePostCount(postId, "commentCount", 1);
    }

    public void decrementCommentCount(String postId) {
        updatePostCount(postId, "commentCount", -1);
    }

    private List<CommunityComment> findCommentsByPostId(String postId) {
        return findCommentsByPostIdPaged(postId, 0, null).getItems();
    }

    private void updatePostCount(String postId, String attributeName, int delta) {
        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s("POST#" + postId).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .updateExpression("ADD #count :delta")
                .expressionAttributeNames(Map.of("#count", attributeName))
                .expressionAttributeValues(Map.of(":delta", AttributeValue.builder().n(String.valueOf(delta)).build()))
                .build());
    }

    private void deleteRaw(String pk, String sk) {
        dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                        "PK", AttributeValue.builder().s(pk).build(),
                        "SK", AttributeValue.builder().s(sk).build()
                ))
                .build());
    }

    private Map<String, AttributeValue> toAttributeMap(Cursor cursor) {
        Map<String, AttributeValue> map = new HashMap<>();
        cursor.getKeys().forEach((k, v) -> map.put(k, AttributeValue.builder().s(v).build()));
        return map;
    }

    private Cursor toCursor(Map<String, AttributeValue> lastKey) {
        if (lastKey == null || lastKey.isEmpty()) {
            return null;
        }
        Map<String, String> keys = new HashMap<>();
        lastKey.forEach((k, v) -> keys.put(k, v.s()));
        return Cursor.builder().keys(keys).build();
    }
}
