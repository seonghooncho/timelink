package com.planner.domain.notification.error;

import com.planner.global.error.BaseErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum NotificationErrorCode implements BaseErrorCode {

    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "알림을 찾을 수 없습니다"),
    INVALID_NOTIFICATION_SETTINGS(HttpStatus.BAD_REQUEST, "INVALID_NOTIFICATION_SETTINGS", "일정 알림을 켠 뒤 리마인드를 설정해주세요");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
