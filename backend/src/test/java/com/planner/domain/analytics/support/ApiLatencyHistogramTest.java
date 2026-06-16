package com.planner.domain.analytics.support;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ApiLatencyHistogramTest {

    @Test
    void bucketAttribute_usesInclusiveUpperBounds() {
        assertThat(ApiLatencyHistogram.bucketAttribute(50)).isEqualTo("latencyLe50");
        assertThat(ApiLatencyHistogram.bucketAttribute(51)).isEqualTo("latencyLe100");
        assertThat(ApiLatencyHistogram.bucketAttribute(1_500)).isEqualTo("latencyLe1500");
        assertThat(ApiLatencyHistogram.bucketAttribute(1_501)).isEqualTo("latencyLe3000");
        assertThat(ApiLatencyHistogram.bucketAttribute(30_001)).isEqualTo("latencyGt30000");
    }

    @Test
    void percentile_returnsBucketUpperBoundFromCumulativeCounts() {
        Map<String, Long> buckets = new LinkedHashMap<>();
        ApiLatencyHistogram.BUCKETS.forEach(bucket -> buckets.put(bucket.attributeName(), 0L));
        buckets.put("latencyLe100", 50L);
        buckets.put("latencyLe400", 45L);
        buckets.put("latencyLe3000", 5L);

        assertThat(ApiLatencyHistogram.percentile(buckets, 0.50)).isEqualTo(100);
        assertThat(ApiLatencyHistogram.percentile(buckets, 0.95)).isEqualTo(400);
        assertThat(ApiLatencyHistogram.percentile(buckets, 0.96)).isEqualTo(3_000);
    }
}
