package com.planner.global.cursor;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Repository 레벨에서 반환하는 커서 기반 페이지 결과.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CursorPageResult<T> {
    private List<T> items;
    private Cursor nextCursor;  // null이면 마지막 페이지
}
