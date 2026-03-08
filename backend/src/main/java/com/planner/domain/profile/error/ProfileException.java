package com.planner.domain.profile.error;

import com.planner.global.error.CustomException;

public class ProfileException extends CustomException {

    public ProfileException(ProfileErrorCode errorCode) {
        super(errorCode);
    }
}
