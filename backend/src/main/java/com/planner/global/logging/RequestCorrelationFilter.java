package com.planner.global.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_REQUEST_ID_KEY = "requestId";
    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("[A-Za-z0-9._:-]{8,128}");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = resolveRequestId(request);
        long startedAt = System.nanoTime();
        Exception thrown = null;

        MDC.put(MDC_REQUEST_ID_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException exception) {
            thrown = exception;
            throw exception;
        } finally {
            long durationMs = Math.max(0, (System.nanoTime() - startedAt) / 1_000_000);
            int status = response.getStatus();
            if (thrown != null && status < 400) {
                status = 500;
            }

            log.info(
                    "http_request_completed requestId={} method={} path={} status={} durationMs={}",
                    requestId,
                    request.getMethod(),
                    resolveSafePath(request),
                    status,
                    durationMs
            );
            MDC.remove(MDC_REQUEST_ID_KEY);
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (StringUtils.hasText(requestId) && SAFE_REQUEST_ID.matcher(requestId).matches()) {
            return requestId;
        }
        return UUID.randomUUID().toString();
    }

    static String resolveSafePath(HttpServletRequest request) {
        Object bestPattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (bestPattern instanceof String pattern && StringUtils.hasText(pattern)) {
            return pattern;
        }
        return sanitizePath(request.getRequestURI());
    }

    static String sanitizePath(String requestUri) {
        if (!StringUtils.hasText(requestUri)) {
            return "/";
        }

        return requestUri
                .replaceAll("(?i)(/invite/)[^/]+", "$1{inviteCode}")
                .replaceAll("(?i)(/groups/join/)[^/]+", "$1{inviteCode}")
                .replaceAll("(?i)(/groups/)(?!join/)[^/]+", "$1{id}")
                .replaceAll("(?i)(/coordination/)[^/]+", "$1{id}")
                .replaceAll("(?i)(/schedules/)[^/]+", "$1{id}")
                .replaceAll("(?i)(/community/posts/)[^/]+", "$1{id}")
                .replaceAll("/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", "/{id}")
                .replaceAll("/[A-Za-z0-9_-]{16,}", "/{id}");
    }
}
