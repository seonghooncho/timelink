package com.planner.domain.coordination.error;

import com.planner.global.error.CustomException;

public class CoordinationException extends CustomException {

    public CoordinationException(CoordinationErrorCode errorCode) {
        super(errorCode);
    }
}
