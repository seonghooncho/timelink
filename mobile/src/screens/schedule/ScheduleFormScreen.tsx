import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, LoaderCircle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { aiApi } from '../../services/api';
import { useCreateSchedule } from '../../hooks/useSchedules';
import { ScheduleCategory } from '../../types';
import { isoDate } from '../../utils/date';
import {
  DEFAULT_SCHEDULE_DURATION,
  DURATION_OPTIONS,
  HALF_HOUR_TIME_OPTIONS,
  formatDurationLabel,
  formatLocalDateTime,
  validateScheduleDateTime,
} from '../../utils/scheduleTime';
import { uploadProcessedImage, validatePickedImage, type PickedImageAsset } from '../../utils/images';

const categories: Array<{ value: ScheduleCategory; label: string }> = [
  { value: 'task', label: '할 일' },
  { value: 'appointment', label: '약속' },
  { value: 'repeat', label: '반복' },
  { value: 'group', label: '그룹' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleForm'>;

export function ScheduleFormScreen({ navigation, route }: Props) {
  const groupContext = useMemo(() => route.params ?? {}, [route.params]);
  const createMutation = useCreateSchedule();
  const availableCategories = useMemo(
    () => groupContext.groupId ? categories : categories.filter((item) => item.value !== 'group'),
    [groupContext.groupId],
  );

  const [category, setCategory] = useState<ScheduleCategory>(groupContext.groupId ? 'group' : 'task');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState(isoDate(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(DEFAULT_SCHEDULE_DURATION);
  const [isImportant, setIsImportant] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImageAsset | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const validation = validatePickedImage(asset);
    if (validation) {
      Alert.alert('이미지 확인 필요', validation);
      return;
    }

    setPreviewImage(asset.uri);
    setPickedImage(asset);
    if (!asset.base64) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await aiApi.extractSchedule(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
      if (data.title) setTitle(data.title);
      if (data.content) setContent(data.content);
      if (data.category && availableCategories.some((item) => item.value === data.category)) {
        setCategory(data.category as ScheduleCategory);
      }
      if (data.startDate) setStartDate(data.startDate);
      if (data.startTime) setStartTime(data.startTime);
      if (data.duration !== undefined) setDuration(data.duration || DEFAULT_SCHEDULE_DURATION);
      if (data.isImportant !== undefined) setIsImportant(data.isImportant);
    } catch (error) {
      const message = error instanceof Error ? error.message : '사진 분석에 실패했습니다.';
      Alert.alert('분석 실패', message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('입력 필요', '제목을 입력해주세요.');
      return;
    }

    const validation = validateScheduleDateTime(startDate, startTime, duration);
    if (validation) {
      Alert.alert('입력 확인', validation);
      return;
    }

    try {
      const uploadedImage = pickedImage
        ? await uploadProcessedImage('SCHEDULE', pickedImage)
        : null;

      await createMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        category,
        isImportant,
        startTime: formatLocalDateTime(startDate, startTime),
        duration,
        hasAlarm,
        groupId: category === 'group' ? groupContext.groupId : undefined,
        imageId: uploadedImage?.imageId,
      });
      navigation.replace('MainTabs');
    } catch (error) {
      const message = error instanceof Error ? error.message : '일정 등록에 실패했습니다.';
      Alert.alert('등록 실패', message);
    }
  };

  return (
    <Screen>
      <PageHeader title="일정 등록" showBack />

      <View style={styles.content}>
        <Pressable onPress={handlePickImage} disabled={isAnalyzing} style={styles.photoCard}>
          {previewImage && !isAnalyzing ? (
            <View>
              <Image source={{ uri: previewImage }} style={styles.photoPreview} />
              <View style={styles.photoOverlay}>
                <View style={styles.photoOverlayChip}>
                  <ImageIcon color={colors.primary} size={16} />
                  <Text style={styles.photoOverlayLabel}>다른 사진으로 변경</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              {isAnalyzing ? (
                <>
                  <View style={styles.photoIconCircle}><LoaderCircle color={colors.primary} size={20} /></View>
                  <Text style={styles.photoPrimary}>AI가 일정을 분석하고 있어요...</Text>
                </>
              ) : (
                <>
                  <View style={styles.photoIconCircle}><Camera color={colors.primary} size={20} /></View>
                  <Text style={styles.photoPrimary}>사진으로 일정 등록</Text>
                  <Text style={styles.photoSecondary}>포스터, 메시지, 캘린더 등을 찍으면 AI가 자동으로 채워줘요</Text>
                </>
              )}
            </View>
          )}
        </Pressable>

        <View>
          <Text style={styles.fieldLabel}>카테고리</Text>
          <View style={styles.categoryRow}>
            {availableCategories.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setCategory(item.value)}
                style={[styles.categoryChip, category === item.value ? styles.categoryChipActive : null]}
              >
                <Text style={[styles.categoryLabel, category === item.value ? styles.categoryLabelActive : null]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {groupContext.groupId ? (
            <Text style={styles.groupHint}>현재 그룹: {groupContext.groupName || '선택된 그룹'}</Text>
          ) : (
            <Text style={styles.groupHint}>그룹 일정은 그룹 상세 화면에서 만들 수 있습니다.</Text>
          )}
        </View>

        <AppTextInput label="제목" value={title} onChangeText={setTitle} placeholder="일정 제목을 입력하세요" />
        <AppTextInput label="내용" value={content} onChangeText={setContent} placeholder="일정 내용을 입력하세요" multiline />

        <AppTextInput label="날짜" value={startDate} onChangeText={setStartDate} placeholder="2026-06-13" />

        <View>
          <Text style={styles.fieldLabel}>시작 시간</Text>
          <View style={styles.optionGrid}>
            {HALF_HOUR_TIME_OPTIONS.map((time) => (
              <Pressable
                key={time}
                onPress={() => setStartTime(time)}
                style={[styles.timeChip, startTime === time ? styles.timeChipActive : null]}
              >
                <Text style={[styles.timeChipLabel, startTime === time ? styles.timeChipLabelActive : null]}>
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>소요 시간</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setDuration(item)}
                style={[styles.durationChip, duration === item ? styles.durationChipActive : null]}
              >
                <Text style={[styles.durationChipLabel, duration === item ? styles.durationChipLabelActive : null]}>
                  {formatDurationLabel(item)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Pressable onPress={() => setIsImportant((prev) => !prev)} style={[styles.toggleChip, isImportant ? styles.toggleChipImportant : null]}>
            <Text style={[styles.toggleChipLabel, isImportant ? styles.toggleChipLabelImportant : null]}>중요</Text>
          </Pressable>
          <Pressable onPress={() => setHasAlarm((prev) => !prev)} style={[styles.toggleChip, hasAlarm ? styles.toggleChipAlarm : null]}>
            <Text style={[styles.toggleChipLabel, hasAlarm ? styles.toggleChipLabelAlarm : null]}>알림</Text>
          </Pressable>
        </View>

        <AppButton label={createMutation.isPending ? '등록 중...' : '등록하기'} onPress={handleSubmit} loading={createMutation.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 18,
  },
  photoCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '08',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 150,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27,32,48,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.md,
  },
  photoOverlayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    gap: 8,
  },
  photoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  photoSecondary: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedForeground,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  categoryLabelActive: {
    color: colors.card,
  },
  groupHint: {
    marginTop: 8,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    minWidth: 56,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  timeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  timeChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  timeChipLabelActive: {
    color: colors.primary,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  durationChipActive: {
    borderColor: colors.foreground,
    backgroundColor: colors.foreground,
  },
  durationChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  durationChipLabelActive: {
    color: colors.card,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  toggleChipImportant: {
    backgroundColor: colors.categoryImportantLight,
    borderColor: colors.categoryImportant,
  },
  toggleChipAlarm: {
    backgroundColor: colors.primary + '14',
    borderColor: colors.primary,
  },
  toggleChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  toggleChipLabelImportant: {
    color: colors.categoryImportantStrong,
  },
  toggleChipLabelAlarm: {
    color: colors.primary,
  },
});
