package com.planner.domain.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.notification.model.Notification;
import com.planner.domain.notification.model.PushSubscription;
import com.planner.domain.notification.repository.PushSubscriptionRepository;
import com.planner.global.config.PushProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    private final PushProperties pushProperties;
    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    @PostConstruct
    void addSecurityProvider() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public boolean isConfigured() {
        return StringUtils.hasText(getPublicKey())
                && StringUtils.hasText(pushProperties.getVapid().getPrivateKey())
                && StringUtils.hasText(pushProperties.getSubject());
    }

    public String getPublicKey() {
        return pushProperties.getVapid().getPublicKey();
    }

    public void sendNotification(String userId, Notification notification) {
        if (!isConfigured()) {
            return;
        }

        String payload = toPayload(notification);
        for (PushSubscription subscription : subscriptionRepository.findByUserId(userId)) {
            sendToSubscription(userId, subscription, payload);
        }
    }

    private void sendToSubscription(String userId, PushSubscription subscription, String payload) {
        try {
            PushService pushService = new PushService(
                    pushProperties.getVapid().getPublicKey(),
                    pushProperties.getVapid().getPrivateKey(),
                    pushProperties.getSubject()
            );
            nl.martijndwars.webpush.Notification pushNotification = new nl.martijndwars.webpush.Notification(
                    subscription.getEndpoint(),
                    subscription.getP256dh(),
                    subscription.getAuth(),
                    payload.getBytes(StandardCharsets.UTF_8)
            );
            HttpResponse response = pushService.send(pushNotification);
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode == 404 || statusCode == 410) {
                subscriptionRepository.deleteBySk(userId, subscription.getSk());
            } else if (statusCode >= 400) {
                log.warn("Web Push 전송 실패: userId={}, status={}", userId, statusCode);
            }
        } catch (Exception e) {
            log.warn("Web Push 전송 중 예외 발생: userId={}", userId, e);
        }
    }

    private String toPayload(Notification notification) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("title", StringUtils.hasText(notification.getTitle()) ? notification.getTitle() : "Timelink");
            payload.put("body", StringUtils.hasText(notification.getContent()) ? notification.getContent() : "새 알림이 도착했습니다");
            payload.put("url", "/notifications");
            payload.put("notificationId", notification.getId());
            payload.put("createdAt", notification.getCreatedAt() != null ? notification.getCreatedAt() : Instant.now().toString());
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{\"title\":\"Timelink\",\"body\":\"새 알림이 도착했습니다\",\"url\":\"/notifications\"}";
        }
    }
}
