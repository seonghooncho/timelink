package com.planner.domain.analytics.support;

import java.util.List;
import java.util.Map;

public final class ApiLatencyHistogram {

    public static final List<Bucket> BUCKETS = List.of(
            new Bucket("latencyLe50", 50),
            new Bucket("latencyLe100", 100),
            new Bucket("latencyLe200", 200),
            new Bucket("latencyLe400", 400),
            new Bucket("latencyLe800", 800),
            new Bucket("latencyLe1500", 1_500),
            new Bucket("latencyLe3000", 3_000),
            new Bucket("latencyLe5000", 5_000),
            new Bucket("latencyLe10000", 10_000),
            new Bucket("latencyLe30000", 30_000),
            new Bucket("latencyGt30000", 30_001)
    );

    private ApiLatencyHistogram() {
    }

    public static String bucketAttribute(long durationMs) {
        long normalized = Math.max(0, durationMs);
        for (Bucket bucket : BUCKETS) {
            if (normalized <= bucket.upperBoundMs()) {
                return bucket.attributeName();
            }
        }
        return BUCKETS.getLast().attributeName();
    }

    public static long percentile(Map<String, Long> bucketCounts, double percentile) {
        long total = bucketCounts.values().stream()
                .mapToLong(Long::longValue)
                .sum();
        if (total <= 0) {
            return 0;
        }

        long target = Math.max(1, (long) Math.ceil(total * percentile));
        long cumulative = 0;
        for (Bucket bucket : BUCKETS) {
            cumulative += Math.max(0, bucketCounts.getOrDefault(bucket.attributeName(), 0L));
            if (cumulative >= target) {
                return bucket.upperBoundMs();
            }
        }
        return BUCKETS.getLast().upperBoundMs();
    }

    public record Bucket(String attributeName, long upperBoundMs) {
    }
}
