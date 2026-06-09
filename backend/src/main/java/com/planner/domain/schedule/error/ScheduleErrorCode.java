package com.planner.domain.schedule.error;

import com.planner.global.error.BaseErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ScheduleErrorCode implements BaseErrorCode {

    SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND, "SCHEDULE_NOT_FOUND", "일정을 찾을 수 없습니다"),
    INVALID_TIME_RANGE(HttpStatus.BAD_REQUEST, "INVALID_TIME_RANGE", "시작 시간이 종료 시간보다 늦을 수 없습니다"),
    INVALID_START_TIME(HttpStatus.BAD_REQUEST, "INVALID_START_TIME", "시작 시간 형식이 올바르지 않습니다"),
    INVALID_DURATION(HttpStatus.BAD_REQUEST, "INVALID_DURATION", "소요 시간은 30분 단위의 양수여야 합니다"),
    SCHEDULE_CROSSES_DAY(HttpStatus.BAD_REQUEST, "SCHEDULE_CROSSES_DAY", "일정은 같은 날짜 안에서 끝나야 합니다");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
