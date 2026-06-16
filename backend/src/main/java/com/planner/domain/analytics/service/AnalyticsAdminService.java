package com.planner.domain.analytics.service;

import com.planner.domain.analytics.dto.AdminMeResDTO;
import com.planner.domain.analytics.dto.AnalyticsSummaryResDTO;
import com.planner.domain.analytics.repository.AnalyticsRepository;
import com.planner.global.config.AnalyticsProperties;
import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsAdminService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final AnalyticsProperties properties;
    private final AnalyticsRepository repository;

    public AdminMeResDTO getMe(String userId) {
        assertAdmin(userId);
        return AdminMeResDTO.builder()
                .admin(true)
                .userId(userId)
                .build();
    }

    public AnalyticsSummaryResDTO getSummary(String userId, String date) {
        assertAdmin(userId);

        LocalDate targetDate = parseDate(date);
        Map<String, Long> counters = repository.getDailyCounters(targetDate.toString());
        AnalyticsRepository.ActiveUsersResult activeToday = repository.getActiveUsers(targetDate, 1);
        AnalyticsRepository.ActiveUsersResult active7d = repository.getActiveUsers(targetDate, 7);
        AnalyticsRepository.ActiveUsersResult active30d = repository.getActiveUsers(targetDate, 30);

        return AnalyticsSummaryResDTO.builder()
                .date(targetDate.toString())
                .totalUsers(repository.getTotalUsers())
                .todaySignups(counters.getOrDefault("signup_completed", 0L))
                .todayActiveUsers(activeToday.count())
                .activeUsers7d(active7d.count())
                .activeUsers30d(active30d.count())
                .todayLinksCreated(counters.getOrDefault("link_created", 0L))
                .todayLinksOpened(counters.getOrDefault("link_opened", 0L))
                .averageActivitySeconds(activeToday.averageActivitySeconds())
                .topFeatures(repository.getTopFeatures(targetDate.toString(), 5))
                .apiPerformance(repository.getApiPerformance(targetDate.toString(), 8))
                .recentErrors(repository.getRecentErrors(10))
                .build();
    }

    private void assertAdmin(String userId) {
        if (!StringUtils.hasText(userId) || !adminUserIds().contains(userId.trim().toLowerCase(Locale.ROOT))) {
            throw new CustomException(GeneralErrorCode.FORBIDDEN);
        }
    }

    private Set<String> adminUserIds() {
        return properties.getAdminUserIds().stream()
                .filter(StringUtils::hasText)
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    private LocalDate parseDate(String date) {
        if (!StringUtils.hasText(date)) {
            return LocalDate.now(SERVICE_ZONE);
        }
        try {
            return LocalDate.parse(date.trim());
        } catch (DateTimeParseException exception) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "date는 YYYY-MM-DD 형식이어야 합니다");
        }
    }
}
