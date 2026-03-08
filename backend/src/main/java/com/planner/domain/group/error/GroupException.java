package com.planner.domain.group.error;

import com.planner.global.error.CustomException;

public class GroupException extends CustomException {

    public GroupException(GroupErrorCode errorCode) {
        super(errorCode);
    }
}
