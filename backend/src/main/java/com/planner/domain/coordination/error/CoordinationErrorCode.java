package com.planner.domain.coordination.error;

import com.planner.global.error.BaseErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum CoordinationErrorCode implements BaseErrorCode {

    COORDINATION_NOT_FOUND(HttpStatus.NOT_FOUND, "COORDINATION_NOT_FOUND", "조율을 찾을 수 없습니다"),
    NOT_COORDINATION_CREATOR(HttpStatus.FORBIDDEN, "NOT_COORDINATION_CREATOR", "생성자만 수행할 수 있습니다"),
    INVALID_COORDINATION_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_COORDINATION_REQUEST", "조율 요청 값을 확인해주세요");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
