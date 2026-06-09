package com.planner.domain.notification.repository;

import com.planner.domain.notification.model.ReminderJob;
import com.planner.global.config.AwsProperties;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class ReminderJobRepository {

    private final DynamoDbTable<ReminderJob> table;

    public ReminderJobRepository(DynamoDbEnhancedClient client, AwsProperties awsProperties) {
        String prefix = awsProperties.getDynamodb().getTablePrefix();
        this.table = client.table(prefix + "main", TableSchema.fromBean(ReminderJob.class));
    }

    public void save(ReminderJob job) {
        table.putItem(job);
    }

    public List<ReminderJob> findByUserId(String userId) {
        return table.query(r -> r.queryConditional(QueryConditional.sortBeginsWith(
                        k -> k.partitionValue("USER#" + userId).sortValue("REMINDER_JOB#")
                )))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    public List<ReminderJob> findByUserIdAndScheduleId(String userId, String scheduleId) {
        return findByUserId(userId).stream()
                .filter(job -> scheduleId.equals(job.getScheduleId()))
                .collect(Collectors.toList());
    }

    public Optional<ReminderJob> findById(String userId, String jobId) {
        Key key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue("REMINDER_JOB#" + jobId)
                .build();
        return Optional.ofNullable(table.getItem(key));
    }

    public void delete(String userId, String jobId) {
        deleteBySk(userId, "REMINDER_JOB#" + jobId);
    }

    public void deleteBySk(String userId, String sk) {
        Key key = Key.builder()
                .partitionValue("USER#" + userId)
                .sortValue(sk)
                .build();
        table.deleteItem(key);
    }
}
