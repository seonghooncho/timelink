package com.planner.domain.community.error;

import com.planner.global.error.BaseErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum CommunityErrorCode implements BaseErrorCode {
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "게시물을 찾을 수 없습니다"),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다"),
    NOT_AUTHOR(HttpStatus.FORBIDDEN, "NOT_AUTHOR", "작성자만 수정하거나 삭제할 수 있습니다"),
    EMPTY_CONTENT(HttpStatus.BAD_REQUEST, "EMPTY_CONTENT", "내용을 입력해주세요");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
