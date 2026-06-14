package com.planner.domain.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planner.domain.notification.dto.ScheduledNotificationEvent;
import com.planner.domain.notification.model.NotificationSettings;
import com.planner.domain.notification.model.ReminderJob;
import com.planner.domain.notification.repository.NotificationRepository;
import com.planner.domain.notification.repository.ReminderJobRepository;
import com.planner.domain.schedule.model.Schedule;
import com.planner.domain.schedule.repository.ScheduleRepository;
import com.planner.global.config.AwsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.scheduler.SchedulerClient;
import software.amazon.awssdk.services.scheduler.model.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;

/**
 * 일정 알림 설정을 EventBridge Scheduler 작업과 동기화한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderSchedulingService {

    private static final ZoneId REMINDER_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("M월 d일 HH:mm");
    private static final DateTimeFormatter SCHEDULER_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final int FUTURE_SYNC_DAYS = 366;

    private final NotificationRepository notificationRepository;
    private final ReminderJobRepository jobRepository;
    private final ScheduleRepository scheduleRepository;
    private final SchedulerClient schedulerClient;
    private final AwsProperties awsProperties;
    private final ObjectMapper objectMapper;

    public void syncUserReminders(String userId, NotificationSettings settings) {
        // 설정 변경은 기존 예약을 모두 지운 뒤 현재 설정 기준으로 다시 만드는 단순 동기화 방식이다.
        deleteAllUserJobs(userId);
        if (!Boolean.TRUE.equals(settings.getScheduleAlarm()) || !hasSchedulerConfig()) {
            return;
        }

        Instant now = Instant.now();
        LocalDateTime localNow = LocalDateTime.ofInstant(now, REMINDER_ZONE);
        String rangeStart = localNow.minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String rangeEnd = localNow.plusDays(FUTURE_SYNC_DAYS).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        List<Schedule> schedules = scheduleRepository.findByUserIdAndTimeRange(userId, rangeStart, rangeEnd);
        for (Schedule schedule : schedules) {
            createScheduleJobs(userId, schedule, settings, now);
        }
    }

    public void rescheduleSchedule(String userId, Schedule schedule) {
        deleteScheduleJobs(userId, schedule.getId());
        scheduleNewSchedule(userId, schedule);
    }

    public void scheduleNewSchedule(String userId, Schedule schedule) {
        NotificationSettings settings = notificationRepository.findSettings(userId).orElse(null);
        if (settings == null || !Boolean.TRUE.equals(settings.getScheduleAlarm()) || !hasSchedulerConfig()) {
            return;
        }
        createScheduleJobs(userId, schedule, settings, Instant.now());
    }

    public void deleteScheduleJobs(String userId, String scheduleId) {
        for (ReminderJob job : jobRepository.findByUserIdAndScheduleId(userId, scheduleId)) {
            deleteJob(userId, job);
        }
    }

    public void deleteJobRecord(String userId, String jobId) {
        jobRepository.findById(userId, jobId).ifPresent(job -> jobRepository.deleteBySk(userId, job.getSk()));
    }

    private void deleteAllUserJobs(String userId) {
        for (ReminderJob job : jobRepository.findByUserId(userId)) {
            deleteJob(userId, job);
        }
    }

    private void deleteJob(String userId, ReminderJob job) {
        deleteScheduler(job.getSchedulerName());
        jobRepository.deleteBySk(userId, job.getSk());
    }

    private void createScheduleJobs(String userId, Schedule schedule, NotificationSettings settings, Instant now) {
        if (!shouldSchedule(schedule)) {
            return;
        }

        Instant startAt = parseInstant(schedule.getStartTime());
        if (startAt == null || !now.isBefore(startAt)) {
            return;
        }

        scheduleJob(userId, schedule, "start", "일정 알림", startAt, now);

        if (Boolean.TRUE.equals(settings.getRemindOneDayBefore())) {
            scheduleRelativeJob(userId, schedule, "one-day", "내일 일정 리마인드", startAt, now, 1, settings.getRemindOneDayBeforeTime());
        }
        if (Boolean.TRUE.equals(settings.getRemindSameDay())) {
            scheduleRelativeJob(userId, schedule, "same-day", "오늘 일정 리마인드", startAt, now, 0, settings.getRemindSameDayTime());
        }
        if (Boolean.TRUE.equals(settings.getImportantAlarm()) && Boolean.TRUE.equals(schedule.getIsImportant())) {
            scheduleRelativeJob(userId, schedule, "important", "중요 일정 리마인드", startAt, now, 0, settings.getImportantAlarmTime());
        }
    }

    private void scheduleRelativeJob(
            String userId,
            Schedule schedule,
            String reminderType,
            String title,
            Instant startAt,
            Instant now,
            int daysBefore,
            String reminderTime
    ) {
        LocalTime time = parseReminderTime(reminderTime);
        ZonedDateTime reminderAt = startAt.atZone(REMINDER_ZONE)
                .toLocalDate()
                .minusDays(daysBefore)
                .atTime(time)
                .atZone(REMINDER_ZONE);

        if (!reminderAt.toInstant().isBefore(startAt)) {
            return;
        }

        // 이미 지난 리마인드는 즉시성 알림으로 보정하되 시작 알림보다 뒤로 가지 않게 한다.
        Instant scheduledAt = reminderAt.toInstant().isBefore(now)
                ? now.plus(Duration.ofMinutes(1))
                : reminderAt.toInstant();
        scheduleJob(userId, schedule, reminderType, title, scheduledAt, now);
    }

    private void scheduleJob(String userId, Schedule schedule, String reminderType, String title, Instant scheduledAt, Instant now) {
        String jobId = "%s-%s".formatted(reminderType, schedule.getId());
        String notificationId = "remind-%s-%s".formatted(reminderType, schedule.getId());
        String schedulerName = "tl-" + shortHash(userId + ":" + jobId);
        String content = "%s · %s".formatted(startLabel(schedule), schedule.getTitle());
        ScheduledNotificationEvent event = new ScheduledNotificationEvent();
        event.setJobId(jobId);
        event.setUserId(userId);
        event.setNotificationId(notificationId);
        event.setType("schedule");
        event.setTitle(title);
        event.setContent(content);
        event.setCategory(schedule.getCategory());
        event.setImportant(Boolean.TRUE.equals(schedule.getIsImportant()));
        event.setScheduleId(schedule.getId());
        event.setReminderType(reminderType);
        event.setTargetType("SCHEDULE");
        event.setTargetId(schedule.getId());
        event.setTargetUrl(resolveScheduleTargetUrl(schedule));

        createScheduler(schedulerName, scheduledAt, event);
        ReminderJob job = ReminderJob.builder()
                .pk("USER#" + userId)
                .sk("REMINDER_JOB#" + jobId)
                .id(jobId)
                .userId(userId)
                .scheduleId(schedule.getId())
                .reminderType(reminderType)
                .schedulerName(schedulerName)
                .scheduledAt(scheduledAt.toString())
                .notificationId(notificationId)
                .title(title)
                .content(content)
                .category(schedule.getCategory())
                .isImportant(Boolean.TRUE.equals(schedule.getIsImportant()))
                .createdAt(now.toString())
                .updatedAt(Instant.now().toString())
                .build();
        jobRepository.save(job);
    }

    private String resolveScheduleTargetUrl(Schedule schedule) {
        return StringUtils.hasText(schedule.getGroupId())
                ? "/groups/%s".formatted(schedule.getGroupId())
                : "/calendar";
    }

    private void createScheduler(String schedulerName, Instant scheduledAt, ScheduledNotificationEvent event) {
        if (!hasSchedulerConfig()) {
            return;
        }

        // 같은 jobId를 다시 예약할 수 있으므로 기존 스케줄을 먼저 제거한다.
        deleteScheduler(schedulerName);
        try {
            String input = objectMapper.writeValueAsString(event);
            String scheduleAt = scheduledAt.atZone(REMINDER_ZONE).format(SCHEDULER_TIME_FORMATTER);
            schedulerClient.createSchedule(CreateScheduleRequest.builder()
                    .name(schedulerName)
                    .groupName(awsProperties.getScheduler().getGroupName())
                    .scheduleExpression("at(%s)".formatted(scheduleAt))
                    .scheduleExpressionTimezone(REMINDER_ZONE.getId())
                    .actionAfterCompletion(ActionAfterCompletion.DELETE)
                    .flexibleTimeWindow(FlexibleTimeWindow.builder().mode(FlexibleTimeWindowMode.OFF).build())
                    .target(Target.builder()
                            .arn(awsProperties.getScheduler().getTargetArn())
                            .roleArn(awsProperties.getScheduler().getRoleArn())
                            .input(input)
                            .build())
                    .build());
        } catch (Exception e) {
            throw new IllegalStateException("EventBridge Scheduler 알림 예약 생성에 실패했습니다: " + schedulerName, e);
        }
    }

    private void deleteScheduler(String schedulerName) {
        if (!hasSchedulerConfig() || !StringUtils.hasText(schedulerName)) {
            return;
        }

        try {
            schedulerClient.deleteSchedule(DeleteScheduleRequest.builder()
                    .name(schedulerName)
                    .groupName(awsProperties.getScheduler().getGroupName())
                    .build());
        } catch (ResourceNotFoundException ignored) {
            // 이미 삭제된 스케줄은 정리된 것으로 본다.
        }
    }

    private boolean shouldSchedule(Schedule schedule) {
        return Boolean.TRUE.equals(schedule.getHasAlarm())
                && !Boolean.TRUE.equals(schedule.getIsCompleted())
                && StringUtils.hasText(schedule.getStartTime());
    }

    private boolean hasSchedulerConfig() {
        return StringUtils.hasText(awsProperties.getScheduler().getGroupName())
                && StringUtils.hasText(awsProperties.getScheduler().getTargetArn())
                && StringUtils.hasText(awsProperties.getScheduler().getRoleArn());
    }

    private LocalTime parseReminderTime(String value) {
        if (!StringUtils.hasText(value)) {
            return LocalTime.of(8, 0);
        }

        try {
            return LocalTime.parse(value.trim());
        } catch (RuntimeException e) {
            return LocalTime.of(8, 0);
        }
    }

    private Instant parseInstant(String value) {
        try {
            return Instant.parse(value);
        } catch (RuntimeException e) {
            try {
                return ZonedDateTime.parse(value).toInstant();
            } catch (RuntimeException ignored) {
                try {
                    return LocalDateTime.parse(value).atZone(REMINDER_ZONE).toInstant();
                } catch (RuntimeException ignoredAgain) {
                    return null;
                }
            }
        }
    }

    private String startLabel(Schedule schedule) {
        Instant startAt = parseInstant(schedule.getStartTime());
        if (startAt == null) {
            return schedule.getStartTime();
        }
        return startAt.atZone(REMINDER_ZONE).format(DISPLAY_TIME_FORMATTER);
    }

    private String shortHash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다", e);
        }
    }
}
