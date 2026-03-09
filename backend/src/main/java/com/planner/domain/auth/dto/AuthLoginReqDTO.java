package com.planner.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthLoginReqDTO {

    @NotBlank
    @Pattern(regexp = "^[a-z0-9][a-z0-9_-]{2,31}$",
            message = "userId는 영문 소문자, 숫자, -, _ 조합의 3~32자여야 합니다")
    private String userId;

    @Size(max = 20, message = "nickname은 20자 이하여야 합니다")
    private String nickname;
}
