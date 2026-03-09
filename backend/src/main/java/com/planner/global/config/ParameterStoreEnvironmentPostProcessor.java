package com.planner.global.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParametersByPathRequest;

import java.util.LinkedHashMap;
import java.util.Map;

public class ParameterStoreEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "aws-ssm-parameter-store";
    private static final String PREFIX_ENV_NAME = "APP_CONFIG_PREFIX";
    private static final String DEFAULT_REGION = "ap-northeast-2";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String parameterPrefix = environment.getProperty(PREFIX_ENV_NAME);
        if (parameterPrefix == null || parameterPrefix.isBlank()) {
            return;
        }

        Map<String, Object> parameterValues = loadParameterValues(parameterPrefix, resolveRegion(environment));
        if (!parameterValues.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, parameterValues));
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    private Map<String, Object> loadParameterValues(String parameterPrefix, String region) {
        Map<String, Object> properties = new LinkedHashMap<>();

        try (SsmClient ssmClient = SsmClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build()) {

            String nextToken = null;
            do {
                GetParametersByPathRequest.Builder requestBuilder = GetParametersByPathRequest.builder()
                        .path(parameterPrefix)
                        .recursive(true)
                        .withDecryption(true);

                if (nextToken != null && !nextToken.isBlank()) {
                    requestBuilder.nextToken(nextToken);
                }

                var response = ssmClient.getParametersByPath(requestBuilder.build());
                response.parameters().forEach(parameter -> {
                    String propertyKey = toPropertyKey(parameterPrefix, parameter.name());
                    if (!propertyKey.isBlank()) {
                        properties.put(propertyKey, parameter.value());
                    }
                });
                nextToken = response.nextToken();
            } while (nextToken != null && !nextToken.isBlank());
        } catch (SdkException exception) {
            throw new IllegalStateException("SSM Parameter Store 값을 읽을 수 없습니다: " + parameterPrefix, exception);
        }

        return properties;
    }

    private String resolveRegion(ConfigurableEnvironment environment) {
        String awsRegion = environment.getProperty("AWS_REGION");
        if (awsRegion != null && !awsRegion.isBlank()) {
            return awsRegion;
        }

        String configuredRegion = environment.getProperty("aws.region");
        if (configuredRegion != null && !configuredRegion.isBlank()) {
            return configuredRegion;
        }

        return DEFAULT_REGION;
    }

    private String toPropertyKey(String prefix, String parameterName) {
        String normalizedPrefix = prefix.endsWith("/") ? prefix : prefix + "/";
        if (!parameterName.startsWith(normalizedPrefix)) {
            return "";
        }

        return parameterName.substring(normalizedPrefix.length()).replace('/', '.');
    }
}
