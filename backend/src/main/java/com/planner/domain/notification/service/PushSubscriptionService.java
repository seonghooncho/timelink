package com.planner.domain.notification.service;

import com.planner.domain.notification.dto.PushSubscriptionReqDTO;
import com.planner.domain.notification.dto.PushSubscriptionResDTO;
import com.planner.domain.notification.model.PushSubscription;
import com.planner.domain.notification.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PushSubscriptionService {

    private final PushSubscriptionRepository repository;
    private final WebPushService webPushService;

    public PushSubscriptionResDTO getPublicKey() {
        return PushSubscriptionResDTO.builder()
                .enabled(webPushService.isConfigured())
                .publicKey(webPushService.getPublicKey())
                .build();
    }

    public PushSubscriptionResDTO save(String userId, PushSubscriptionReqDTO req) {
        String id = PushSubscriptionRepository.idFromEndpoint(req.getEndpoint());
        String now = Instant.now().toString();
        PushSubscription subscription = repository.findByEndpoint(userId, req.getEndpoint())
                .orElseGet(() -> PushSubscription.builder()
                        .pk("USER#" + userId)
                        .sk("PUSH_SUB#" + id)
                        .id(id)
                        .userId(userId)
                        .createdAt(now)
                        .build());

        subscription.setEndpoint(req.getEndpoint());
        subscription.setP256dh(req.getKeys().getP256dh());
        subscription.setAuth(req.getKeys().getAuth());
        subscription.setUserAgent(req.getUserAgent());
        subscription.setUpdatedAt(now);
        repository.save(subscription);

        return getPublicKey();
    }

    public void delete(String userId, PushSubscriptionReqDTO req) {
        repository.deleteByEndpoint(userId, req.getEndpoint());
    }
}
