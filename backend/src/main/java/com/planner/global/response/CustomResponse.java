package com.planner.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CustomResponse<T> {

    private T data;
    private ErrorDetail error;
    private PageMeta meta;

    public static <T> CustomResponse<T> ok(T data) {
        return CustomResponse.<T>builder().data(data).build();
    }

    public static <T> CustomResponse<T> ok(T data, PageMeta meta) {
        return CustomResponse.<T>builder().data(data).meta(meta).build();
    }

    public static <T> CustomResponse<T> error(String code, String message) {
        return CustomResponse.<T>builder()
                .error(new ErrorDetail(code, message))
                .build();
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ErrorDetail {
        private String code;
        private String message;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PageMeta {
        private int perPage;
        private String nextCursor;  // null이면 마지막 페이지
    }
}
