package com.planner.domain.schedule.util;

import com.planner.domain.schedule.error.ScheduleErrorCode;
import com.planner.domain.schedule.error.ScheduleException;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class ScheduleTimeCalculator {

    public static final double DEFAULT_DURATION_HOURS = 1.0;

    private static final int MIN_DURATION_MINUTES = 30;
    private static final int DURATION_STEP_MINUTES = 30;
    private static final double EPSILON = 0.000001;

    private ScheduleTimeCalculator() {
    }

    public static double resolveDuration(Double durationHours) {
        if (durationHours == null) {
            return DEFAULT_DURATION_HOURS;
        }

        if (!Double.isFinite(durationHours) || durationHours <= 0) {
            throw new ScheduleException(ScheduleErrorCode.INVALID_DURATION);
        }

        double rawMinutes = durationHours * 60;
        long minutes = Math.round(rawMinutes);
        if (Math.abs(rawMinutes - minutes) > EPSILON
                || minutes < MIN_DURATION_MINUTES
                || minutes % DURATION_STEP_MINUTES != 0) {
            throw new ScheduleException(ScheduleErrorCode.INVALID_DURATION);
        }

        return minutes / 60.0;
    }

    public static String calculateEndTime(String startTime, double durationHours) {
        if (!StringUtils.hasText(startTime)) {
            throw new ScheduleException(ScheduleErrorCode.INVALID_START_TIME);
        }

        long durationMinutes = Math.round(durationHours * 60);
        String trimmedStartTime = startTime.trim();
        try {
            OffsetDateTime start = OffsetDateTime.parse(trimmedStartTime);
            OffsetDateTime end = start.plusMinutes(durationMinutes);
            if (!start.toLocalDate().equals(end.toLocalDate())) {
                throw new ScheduleException(ScheduleErrorCode.SCHEDULE_CROSSES_DAY);
            }
            return end.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            return calculateLocalEndTime(trimmedStartTime, durationMinutes);
        }
    }

    private static String calculateLocalEndTime(String startTime, long durationMinutes) {
        try {
            LocalDateTime start = LocalDateTime.parse(startTime);
            LocalDateTime end = start.plusMinutes(durationMinutes);
            if (!start.toLocalDate().equals(end.toLocalDate())) {
                throw new ScheduleException(ScheduleErrorCode.SCHEDULE_CROSSES_DAY);
            }
            return end.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            throw new ScheduleException(ScheduleErrorCode.INVALID_START_TIME);
        }
    }
}
