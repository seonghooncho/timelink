package com.planner.domain.schedule.error;

import com.planner.global.error.CustomException;

public class ScheduleException extends CustomException {

    public ScheduleException(ScheduleErrorCode errorCode) {
        super(errorCode);
    }

    public ScheduleException(ScheduleErrorCode errorCode, String detailMessage) {
        super(errorCode, detailMessage);
    }
}
