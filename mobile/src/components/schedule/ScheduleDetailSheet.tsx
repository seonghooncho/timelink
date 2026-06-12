import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radius } from '../../constants/theme';
import { Schedule } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { AppButton } from '../common/AppButton';
import { formatDateTimeDuration } from '../../utils/date';

interface ScheduleDetailSheetProps {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (schedule: Schedule) => void;
}

export function ScheduleDetailSheet({ schedule, open, onClose, onDelete }: ScheduleDetailSheetProps) {
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

          {onDelete ? (
            <AppButton
              label="일정 삭제"
              variant="secondary"
              onPress={() => onDelete(schedule)}
              style={{ marginTop: 20 }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
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
});
