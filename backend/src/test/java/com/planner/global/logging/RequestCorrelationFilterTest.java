package com.planner.global.logging;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class RequestCorrelationFilterTest {

    private final RequestCorrelationFilter filter = new RequestCorrelationFilter();

    @Test
    void reusesValidRequestIdAndReturnsItInResponseHeader() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/planner/v1/groups/secret-group-id");
        request.addHeader(RequestCorrelationFilter.REQUEST_ID_HEADER, "req-12345678");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/planner/v1/groups/{id}");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(HttpStatus.NO_CONTENT.value());

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(RequestCorrelationFilter.REQUEST_ID_HEADER)).isEqualTo("req-12345678");
        assertThat(RequestCorrelationFilter.resolveSafePath(request)).isEqualTo("/api/planner/v1/groups/{id}");
    }

    @Test
    void masksInviteCodesWhenRoutePatternIsNotAvailable() {
        assertThat(RequestCorrelationFilter.sanitizePath("/invite/ABC123"))
                .isEqualTo("/invite/{inviteCode}");
        assertThat(RequestCorrelationFilter.sanitizePath("/api/planner/v1/groups/join/ABC123"))
                .isEqualTo("/api/planner/v1/groups/join/{inviteCode}");
    }

    @Test
    void generatesRequestIdWhenHeaderIsUnsafe() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        request.addHeader(RequestCorrelationFilter.REQUEST_ID_HEADER, "bad header with spaces");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(RequestCorrelationFilter.REQUEST_ID_HEADER))
                .isNotBlank()
                .isNotEqualTo("bad header with spaces");
    }
}
