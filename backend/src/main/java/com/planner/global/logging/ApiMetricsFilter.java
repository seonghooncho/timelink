package com.planner.global.logging;

import com.planner.domain.analytics.service.ApiPerformanceService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ApiMetricsFilter extends OncePerRequestFilter {

    private static final String API_PREFIX = "/api/planner/v1/";
    private static final String PRODUCT_ANALYTICS_TRACK = "/api/planner/v1/analytics/track";

    private final ObjectProvider<ApiPerformanceService> apiPerformanceServiceProvider;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        Exception thrown = null;

        try {
            filterChain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException exception) {
            thrown = exception;
            throw exception;
        } finally {
            if (shouldTrack(request)) {
                long durationMs = Math.max(0, (System.nanoTime() - startedAt) / 1_000_000);
                int status = response.getStatus();
                if (thrown != null && status < 400) {
                    status = 500;
                }
                int finalStatus = status;
                apiPerformanceServiceProvider.ifAvailable(apiPerformanceService ->
                        apiPerformanceService.record(
                                request.getMethod(),
                                RequestCorrelationFilter.resolveSafePath(request),
                                finalStatus,
                                durationMs
                        ));
            }
        }
    }

    private boolean shouldTrack(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return false;
        }

        String uri = request.getRequestURI();
        if (!StringUtils.hasText(uri)) {
            return false;
        }

        return uri.startsWith(API_PREFIX) && !PRODUCT_ANALYTICS_TRACK.equals(uri);
    }
}
