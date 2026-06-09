package com.planner;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.planner.domain.notification.dto.ScheduledNotificationEvent;
import com.planner.domain.notification.service.NotificationService;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.Map;

public class NotificationSchedulerLambdaHandler implements RequestHandler<ScheduledNotificationEvent, Map<String, Object>> {

    private static final ConfigurableApplicationContext context = new SpringApplicationBuilder(PlannerApplication.class)
            .run();

    @Override
    public Map<String, Object> handleRequest(ScheduledNotificationEvent event, Context lambdaContext) {
        context.getBean(NotificationService.class).deliverScheduledNotification(event);
        return Map.of("ok", true);
    }
}
