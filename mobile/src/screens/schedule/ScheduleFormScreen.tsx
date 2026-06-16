import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, LoaderCircle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { aiApi, groupApi } from '../../services/api';
import { useCreateSchedule } from '../../hooks/useSchedules';
import { GroupMember, ScheduleCategory } from '../../types';
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
import { SCHEDULE_CONTENT_MAX_LENGTH, SCHEDULE_TITLE_MAX_LENGTH } from '../../constants/textLimits';
import { trackMobileError } from '../../services/analytics';

const categories: Array<{ value: ScheduleCategory; label: string }> = [
  { value: 'task', label: '할 일' },
  { value: 'appointment', label: '약속' },
  { value: 'repeat', label: '반복' },
  { value: 'group', label: '모임' },
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
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImageAsset | null>(null);

  useEffect(() => {
    if (!groupContext.groupId) return;
    groupApi.getMembers(groupContext.groupId)
      .then((items) => {
        setMembers(items);
        setParticipantUserIds(items.map((member) => member.userId));
      })
      .catch(() => setMembers([]));
  }, [groupContext.groupId]);

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => (member.nickname || member.userId).toLowerCase().includes(query));
  }, [memberQuery, members]);

  const allSelected = members.length > 0 && members.every((member) => participantUserIds.includes(member.userId));

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

    const startAt = new Date(formatLocalDateTime(startDate, startTime));
    if (startAt.getTime() < Date.now()) {
      Alert.alert('지난 일정입니다', '이미 지난 시간입니다. 그래도 만들까요?', [
        { text: '취소', style: 'cancel' },
        { text: '만들기', onPress: () => submitSchedule() },
      ]);
      return;
    }

    await submitSchedule();
  };

  const submitSchedule = async () => {
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
        participantUserIds: category === 'group' ? participantUserIds : undefined,
        imageId: uploadedImage?.imageId,
      });
      navigation.replace('MainTabs');
    } catch (error) {
      const message = error instanceof Error ? error.message : '일정 생성에 실패했습니다.';
      trackMobileError('schedule_create_error', 'schedule');
      Alert.alert('등록 실패', message);
    }
  };

  return (
    <Screen>
      <PageHeader title="일정 생성" showBack />

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
                  <Text style={styles.photoPrimary}>사진으로 일정 생성</Text>
                  <Text style={styles.photoSecondary}>포스터, 메시지, 캘린더 등을 찍으면 AI가 자동으로 채워줘요</Text>
                </>
              )}
            </View>
          )}
        </Pressable>

        {!groupContext.groupId ? (
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
          </View>
        ) : (
          <View>
            <Text style={styles.fieldLabel}>카테고리</Text>
            <View style={[styles.categoryChip, styles.categoryChipActive, styles.fixedCategoryChip]}>
              <Text style={styles.categoryLabelActive}>모임</Text>
            </View>
            <Text style={styles.groupHint}>현재 모임: {groupContext.groupName || '선택된 모임'}</Text>
          </View>
        )}

        <AppTextInput label={`제목 ${title.length}/${SCHEDULE_TITLE_MAX_LENGTH}`} value={title} onChangeText={setTitle} maxLength={SCHEDULE_TITLE_MAX_LENGTH} placeholder="일정 제목을 입력하세요" />
        <AppTextInput label={`내용 ${content.length}/${SCHEDULE_CONTENT_MAX_LENGTH}`} value={content} onChangeText={setContent} maxLength={SCHEDULE_CONTENT_MAX_LENGTH} placeholder="일정 내용을 입력하세요" multiline />

        {groupContext.groupId ? (
          <View style={styles.memberSection}>
            <View style={styles.memberSectionHeader}>
              <Text style={styles.fieldLabel}>참여 멤버</Text>
              <Pressable
                onPress={() => {
                  if (allSelected) setParticipantUserIds([]);
                  else setParticipantUserIds(members.map((member) => member.userId));
                }}
                style={styles.selectAllButton}
              >
                <Text style={styles.selectAllLabel}>{allSelected ? '전체 해제' : '전체 선택'}</Text>
              </Pressable>
            </View>
            <AppTextInput value={memberQuery} onChangeText={setMemberQuery} placeholder="이름 검색" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberScroll}>
              {filteredMembers.map((member) => {
                const selected = participantUserIds.includes(member.userId);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => {
                      setParticipantUserIds((prev) => selected
                        ? prev.filter((userId) => userId !== member.userId)
                        : [...prev, member.userId]);
                    }}
                    style={[styles.memberChip, selected ? styles.memberChipSelected : null]}
                  >
                    <Text numberOfLines={1} style={[styles.memberChipName, selected ? styles.memberChipNameSelected : null]}>
                      {member.nickname || member.userId}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.groupHint}>{participantUserIds.length}명 선택</Text>
          </View>
        ) : null}

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

        <AppButton label={createMutation.isPending ? '생성 중...' : '생성하기'} onPress={handleSubmit} loading={createMutation.isPending} />
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
  fixedCategoryChip: {
    alignSelf: 'flex-start',
  },
  memberSection: {
    gap: 10,
  },
  memberSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.categoryGroupLight,
  },
  selectAllLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.categoryGroupStrong,
  },
  memberScroll: {
    gap: 8,
  },
  memberChip: {
    maxWidth: 110,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberChipSelected: {
    borderColor: colors.categoryGroup,
    backgroundColor: colors.categoryGroupLight,
  },
  memberChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  memberChipNameSelected: {
    color: colors.categoryGroupStrong,
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
