package com.planner.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "aws")
public class AwsProperties {
    private String region;
    private DynamoDb dynamodb = new DynamoDb();

    @Getter
    @Setter
    public static class DynamoDb {
        private String endpoint;
        private String tablePrefix;
    }
}
