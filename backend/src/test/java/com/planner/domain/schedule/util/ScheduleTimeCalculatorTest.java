package com.planner.domain.schedule.util;

import com.planner.domain.schedule.error.ScheduleErrorCode;
import com.planner.domain.schedule.error.ScheduleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScheduleTimeCalculatorTest {

    @Test
    @DisplayName("소요시간이 없으면 1시간을 기본값으로 사용한다")
    void resolveDuration_usesDefaultWhenMissing() {
        assertThat(ScheduleTimeCalculator.resolveDuration(null)).isEqualTo(1.0);
    }

    @Test
    @DisplayName("소요시간은 30분 단위 양수만 허용한다")
    void resolveDuration_rejectsInvalidStep() {
        assertThat(ScheduleTimeCalculator.resolveDuration(0.5)).isEqualTo(0.5);
        assertThatThrownBy(() -> ScheduleTimeCalculator.resolveDuration(1.25))
                .isInstanceOf(ScheduleException.class)
                .extracting("errorCode")
                .isEqualTo(ScheduleErrorCode.INVALID_DURATION);
        assertThatThrownBy(() -> ScheduleTimeCalculator.resolveDuration(0.0))
                .isInstanceOf(ScheduleException.class)
                .extracting("errorCode")
                .isEqualTo(ScheduleErrorCode.INVALID_DURATION);
        assertThatThrownBy(() -> ScheduleTimeCalculator.resolveDuration(Double.POSITIVE_INFINITY))
                .isInstanceOf(ScheduleException.class)
                .extracting("errorCode")
                .isEqualTo(ScheduleErrorCode.INVALID_DURATION);
    }

    @Test
    @DisplayName("오프셋 시간이 들어오면 시작시간과 소요시간으로 종료시간을 계산한다")
    void calculateEndTime_preservesOffsetDateTime() {
        String endTime = ScheduleTimeCalculator.calculateEndTime("2026-06-13T09:00:00+09:00", 1.5);

        assertThat(endTime).isEqualTo("2026-06-13T10:30:00+09:00");
    }

    @Test
    @DisplayName("시작시간과 소요시간이 날짜를 넘기면 예외를 던진다")
    void calculateEndTime_rejectsCrossingDay() {
        assertThatThrownBy(() -> ScheduleTimeCalculator.calculateEndTime("2026-06-13T23:30:00", 1.0))
                .isInstanceOf(ScheduleException.class)
                .extracting("errorCode")
                .isEqualTo(ScheduleErrorCode.SCHEDULE_CROSSES_DAY);
    }

    @Test
    @DisplayName("시작시간 형식이 올바르지 않으면 예외를 던진다")
    void calculateEndTime_rejectsInvalidStartTime() {
        assertThatThrownBy(() -> ScheduleTimeCalculator.calculateEndTime("2026/06/13 09:00", 1.0))
                .isInstanceOf(ScheduleException.class)
                .extracting("errorCode")
                .isEqualTo(ScheduleErrorCode.INVALID_START_TIME);
    }
}
