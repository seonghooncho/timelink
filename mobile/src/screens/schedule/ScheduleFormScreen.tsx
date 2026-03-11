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

  const [category, setCategory] = useState<ScheduleCategory>(groupContext.groupId ? 'group' : 'task');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    setPreviewImage(asset.uri);
    if (!asset.base64) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await aiApi.extractSchedule(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
      if (data.title) setTitle(data.title);
      if (data.content) setContent(data.content);
      if (data.category && categories.some((item) => item.value === data.category)) setCategory(data.category as ScheduleCategory);
      if (data.startDate) setStartDate(data.startDate);
      if (data.startTime) setStartTime(data.startTime);
      if (data.endDate) setEndDate(data.endDate);
      if (data.endTime) setEndTime(data.endTime);
      if (data.duration !== undefined) setDuration(String(data.duration));
      if (data.isImportant !== undefined) setIsImportant(data.isImportant);
    } catch (error) {
      const message = error instanceof Error ? error.message : '사진 분석에 실패했습니다.';
      Alert.alert('분석 실패', message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !startDate || !startTime) {
      Alert.alert('입력 필요', '제목, 시작 날짜, 시작 시간을 입력해주세요.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title,
        content,
        category,
        isImportant,
        startTime: `${startDate}T${startTime}:00`,
        endTime: endDate && endTime ? `${endDate}T${endTime}:00` : `${startDate}T${startTime}:00`,
        duration: parseFloat(duration) || 0,
        hasAlarm,
        groupId: category === 'group' ? groupContext.groupId : undefined,
      });
      navigation.replace('MainTabs');
    } catch {
      Alert.alert('등록 실패', '일정 등록에 실패했습니다.');
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
            {categories.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setCategory(item.value)}
                style={[styles.categoryChip, category === item.value ? styles.categoryChipActive : null]}
              >
                <Text style={[styles.categoryLabel, category === item.value ? styles.categoryLabelActive : null]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {groupContext.groupId ? <Text style={styles.groupHint}>현재 그룹: {groupContext.groupName || '선택된 그룹'}</Text> : null}
        </View>

        <AppTextInput label="제목" value={title} onChangeText={setTitle} placeholder="일정 제목을 입력하세요" />
        <AppTextInput label="내용" value={content} onChangeText={setContent} placeholder="일정 내용을 입력하세요" multiline />

        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <AppTextInput label="시작 날짜" value={startDate} onChangeText={setStartDate} placeholder="2026-03-12" />
          </View>
          <View style={{ flex: 1 }}>
            <AppTextInput label="시작 시간" value={startTime} onChangeText={setStartTime} placeholder="19:00" />
          </View>
          <View style={{ flex: 1 }}>
            <AppTextInput label="종료 날짜" value={endDate} onChangeText={setEndDate} placeholder="2026-03-12" />
          </View>
          <View style={{ flex: 1 }}>
            <AppTextInput label="종료 시간" value={endTime} onChangeText={setEndTime} placeholder="20:30" />
          </View>
        </View>

        <AppTextInput label="소요 시간 (시간)" value={duration} onChangeText={setDuration} placeholder="예: 1.5" keyboardType="decimal-pad" />

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
