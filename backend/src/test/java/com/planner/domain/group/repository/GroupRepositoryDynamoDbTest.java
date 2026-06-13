package com.planner.domain.group.repository;

import com.planner.domain.group.model.GroupInvite;
import com.planner.global.config.AwsProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeDefinition;
import software.amazon.awssdk.services.dynamodb.model.BillingMode;
import software.amazon.awssdk.services.dynamodb.model.CreateTableRequest;
import software.amazon.awssdk.services.dynamodb.model.KeySchemaElement;
import software.amazon.awssdk.services.dynamodb.model.KeyType;
import software.amazon.awssdk.services.dynamodb.model.ScalarAttributeType;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class GroupRepositoryDynamoDbTest {

    private static final String TABLE_NAME = "tltest_main";

    @Container
    static GenericContainer<?> dynamodb = new GenericContainer<>(DockerImageName.parse("amazon/dynamodb-local:latest"))
            .withExposedPorts(8000)
            .waitingFor(Wait.forListeningPort());

    private GroupRepository repository;

    @BeforeEach
    void setUp() {
        DynamoDbClient dynamoDbClient = DynamoDbClient.builder()
                .endpointOverride(URI.create("http://" + dynamodb.getHost() + ":" + dynamodb.getMappedPort(8000)))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test")))
                .region(Region.AP_NORTHEAST_2)
                .build();
        dynamoDbClient.createTable(CreateTableRequest.builder()
                .tableName(TABLE_NAME)
                .attributeDefinitions(
                        AttributeDefinition.builder().attributeName("PK").attributeType(ScalarAttributeType.S).build(),
                        AttributeDefinition.builder().attributeName("SK").attributeType(ScalarAttributeType.S).build()
                )
                .keySchema(
                        KeySchemaElement.builder().attributeName("PK").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("SK").keyType(KeyType.RANGE).build()
                )
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .build());

        AwsProperties awsProperties = new AwsProperties();
        awsProperties.getDynamodb().setTablePrefix("tltest_");
        repository = new GroupRepository(
                DynamoDbEnhancedClient.builder().dynamoDbClient(dynamoDbClient).build(),
                dynamoDbClient,
                awsProperties
        );
    }

    @Test
    @DisplayName("초대 코드는 DynamoDB 조건부 쓰기로 중복 생성을 막는다")
    void saveInviteIfAbsent_blocksDuplicateInviteCode() {
        GroupInvite invite = GroupInvite.builder()
                .pk("INVITE#ABC123")
                .sk("METADATA")
                .inviteCode("ABC123")
                .groupId("group-1")
                .createdAt("2026-06-13T00:00:00Z")
                .build();

        assertThat(repository.saveInviteIfAbsent(invite)).isTrue();
        assertThat(repository.saveInviteIfAbsent(invite)).isFalse();
        assertThat(repository.findInvite("ABC123"))
                .hasValueSatisfying(found -> assertThat(found.getGroupId()).isEqualTo("group-1"));
    }
}
