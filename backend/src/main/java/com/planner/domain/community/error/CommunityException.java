package com.planner.domain.community.error;

import com.planner.global.error.CustomException;

public class CommunityException extends CustomException {
    public CommunityException(CommunityErrorCode errorCode) {
        super(errorCode);
    }
}
