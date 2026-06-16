package com.planner.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "analytics")
public class AnalyticsProperties {

    private boolean enabled = false;
    private String hmacSecret = "";
    private String rawBucketName = "";
    private List<String> adminUserIds = new ArrayList<>();
    private boolean apiMetricsEnabled = true;
}
