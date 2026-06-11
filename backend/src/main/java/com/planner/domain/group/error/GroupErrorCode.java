package com.planner.domain.group.error;

import com.planner.global.error.BaseErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum GroupErrorCode implements BaseErrorCode {

    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "GROUP_NOT_FOUND", "그룹을 찾을 수 없습니다"),
    NOT_GROUP_MEMBER(HttpStatus.FORBIDDEN, "NOT_GROUP_MEMBER", "그룹 멤버만 접근할 수 있습니다"),
    NOT_GROUP_MANAGER(HttpStatus.FORBIDDEN, "NOT_GROUP_MANAGER", "관리자만 수행할 수 있습니다"),
    CANNOT_REMOVE_SELF(HttpStatus.BAD_REQUEST, "CANNOT_REMOVE_SELF", "자기 자신은 멤버 관리에서 내보낼 수 없습니다"),
    ALREADY_MEMBER(HttpStatus.CONFLICT, "ALREADY_MEMBER", "이미 그룹에 가입되어 있습니다"),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "INVALID_INVITE_CODE", "유효하지 않은 초대 코드입니다");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
