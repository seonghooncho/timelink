package com.planner;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.planner.domain.notification.dto.ScheduledNotificationEvent;
import com.planner.domain.notification.service.NotificationService;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.Map;

public class NotificationSchedulerLambdaHandler implements RequestHandler<ScheduledNotificationEvent, Map<String, Object>> {

    private static volatile ConfigurableApplicationContext context;

    @Override
    public Map<String, Object> handleRequest(ScheduledNotificationEvent event, Context lambdaContext) {
        getContext().getBean(NotificationService.class).deliverScheduledNotification(event);
        return Map.of("ok", true);
    }

    private ConfigurableApplicationContext getContext() {
        if (context == null) {
            synchronized (NotificationSchedulerLambdaHandler.class) {
                if (context == null) {
                    context = new SpringApplicationBuilder(PlannerApplication.class)
                            .web(WebApplicationType.NONE)
                            .run();
                }
            }
        }
        return context;
    }
}
