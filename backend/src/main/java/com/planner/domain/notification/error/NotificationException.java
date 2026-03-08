package com.planner.domain.notification.error;

import com.planner.global.error.CustomException;

public class NotificationException extends CustomException {

    public NotificationException(NotificationErrorCode errorCode) {
        super(errorCode);
    }
}
