package com.planner.global.error;

import com.planner.global.response.CustomResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("CustomException을 적절한 HTTP 상태와 에러 코드로 변환한다")
    void shouldHandleCustomException() {
        CustomException ex = new CustomException(GeneralErrorCode.FORBIDDEN);

        ResponseEntity<CustomResponse<Void>> response = handler.handleCustomException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody().getError().getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    @DisplayName("상세 메시지가 있는 CustomException을 처리한다")
    void shouldHandleCustomExceptionWithDetail() {
        CustomException ex = new CustomException(GeneralErrorCode.BAD_REQUEST, "커스텀 에러 메시지");

        ResponseEntity<CustomResponse<Void>> response = handler.handleCustomException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().getError().getMessage()).isEqualTo("커스텀 에러 메시지");
    }

    @Test
    @DisplayName("일반 Exception을 500으로 변환한다")
    void shouldHandleGenericException() {
        Exception ex = new RuntimeException("unexpected");

        ResponseEntity<CustomResponse<Void>> response = handler.handleException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().getError().getCode()).isEqualTo("INTERNAL_ERROR");
    }
}
