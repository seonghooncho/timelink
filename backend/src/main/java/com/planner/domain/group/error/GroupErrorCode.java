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
    INVALID_GROUP_VISIBILITY(HttpStatus.BAD_REQUEST, "INVALID_GROUP_VISIBILITY", "지원하지 않는 모임 공개 설정입니다"),
    NOT_PUBLIC_GROUP(HttpStatus.BAD_REQUEST, "NOT_PUBLIC_GROUP", "공개 모임에만 가입요청을 보낼 수 있습니다"),
    JOIN_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "JOIN_REQUEST_NOT_FOUND", "가입요청을 찾을 수 없습니다"),
    INVALID_JOIN_REQUEST_STATUS(HttpStatus.BAD_REQUEST, "INVALID_JOIN_REQUEST_STATUS", "처리할 수 없는 가입요청 상태입니다"),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "INVALID_INVITE_CODE", "유효하지 않은 초대 코드입니다");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
