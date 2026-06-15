import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radius } from '../../constants/theme';
import { Schedule, ScheduleParticipant } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { AppButton } from '../common/AppButton';
import { PersonAvatar } from '../common/GroupAvatar';
import { formatDateTimeDuration } from '../../utils/date';

interface ScheduleDetailSheetProps {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (schedule: Schedule) => void;
  onLeaveParticipation?: (schedule: Schedule) => void;
  onParticipantPress?: (participant: ScheduleParticipant, schedule: Schedule) => void;
}

export function ScheduleDetailSheet({
  schedule,
  open,
  onClose,
  onDelete,
  onLeaveParticipation,
  onParticipantPress,
}: ScheduleDetailSheetProps) {
  if (!schedule) {
    return null;
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <CategoryBadge category={schedule.category} />
              {schedule.isImportant ? <CategoryBadge category="important" /> : null}
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={styles.title}>{schedule.title}</Text>
          <Text style={styles.range}>
            {formatDateTimeDuration(schedule.startTime, schedule.duration, schedule.endTime)}
          </Text>

          {schedule.content ? (
            <View style={styles.contentCard}>
              <Text style={styles.content}>{schedule.content}</Text>
            </View>
          ) : null}

          {schedule.category === 'group' || schedule.participants?.length ? (
            <View style={styles.participantSection}>
              <View style={styles.participantHeader}>
                <Text style={styles.participantTitle}>참여 인원</Text>
                <Text style={styles.participantCount}>{schedule.participants?.length ?? 0}명</Text>
              </View>
              {!schedule.participants ? (
                <Text style={styles.participantHint}>참여자 정보를 불러오는 중입니다.</Text>
              ) : schedule.participants.length === 0 ? (
                <Text style={styles.participantHint}>표시할 참여자가 없습니다.</Text>
              ) : (
                <View style={styles.participantRow}>
                  {schedule.participants.map((participant) => (
                    <Pressable
                      key={participant.userId}
                      disabled={!onParticipantPress}
                      onPress={() => onParticipantPress?.(participant, schedule)}
                      style={styles.participantItem}
                    >
                      <PersonAvatar
                        image={participant.avatarUrl}
                        thumbnail={participant.thumbnailUrl}
                        name={getParticipantDisplay(participant).name}
                        size={40}
                      />
                      <Text numberOfLines={1} style={styles.participantName}>{getParticipantDisplay(participant).name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {onDelete ? (
            <AppButton
              label="일정 삭제"
              variant="secondary"
              onPress={() => onDelete(schedule)}
              style={{ marginTop: 20 }}
            />
          ) : null}
          {onLeaveParticipation ? (
            <AppButton
              label="약속 빠지기"
              variant="secondary"
              onPress={() => onLeaveParticipation(schedule)}
              style={{ marginTop: 20 }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function getParticipantDisplay(participant: ScheduleParticipant) {
  return {
    name: participant.nickname?.trim() || participant.userId || '참여자',
    canOpenProfile: Boolean(participant.userId),
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 32, 48, 0.24)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 6,
    borderRadius: radius.md,
  },
  title: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  range: {
    marginTop: 10,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  contentCard: {
    marginTop: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
  },
  participantSection: {
    marginTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 10,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
  participantCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  participantHint: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  participantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  participantItem: {
    width: 52,
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    maxWidth: 52,
    fontSize: 10,
    color: colors.mutedForeground,
  },
});
