package com.planner.global.pagination;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DynamoDB lastEvaluatedKey를 래핑하는 커서 객체.
 * keys 맵에는 PK, SK (및 GSI 키)가 들어간다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cursor {
    private Map<String, String> keys;
}
