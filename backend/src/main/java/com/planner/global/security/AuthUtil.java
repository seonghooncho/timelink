package com.planner.global.security;

import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class AuthUtil {

    private AuthUtil() {}

    public static String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new CustomException(GeneralErrorCode.UNAUTHORIZED);
        }
        return (String) auth.getPrincipal();
    }
}
