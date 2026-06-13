import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, LogOut, Pencil, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { SectionCard } from '../../components/common/SectionCard';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { ToggleSwitch } from '../../components/common/ToggleSwitch';
import { colors, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useProfile, useUpdateProfile } from '../../hooks/useProfile';
import { settingsApi } from '../../services/api';
import { processingImageLabel, uploadProcessedImage, validatePickedImage, waitForImageProcessing } from '../../utils/images';

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [nickname, setNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [draftNickname, setDraftNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [imageStatus, setImageStatus] = useState(profile?.imageStatus);
  const [scheduleAlarm, setScheduleAlarm] = useState(false);
  const [pushAlarm, setPushAlarm] = useState(false);
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(false);
  const [remindOneDayBeforeTime, setRemindOneDayBeforeTime] = useState('22:00');
  const [remindSameDay, setRemindSameDay] = useState(false);
  const [remindSameDayTime, setRemindSameDayTime] = useState('08:00');
  const [importantAlarm, setImportantAlarm] = useState(false);
  const [importantAlarmTime, setImportantAlarmTime] = useState('08:00');

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '사용자');
      setAvatarUrl(profile.avatarUrl);
      setImageStatus(profile.imageStatus);
    }
  }, [profile]);

  useEffect(() => {
    settingsApi.getNotifications()
      .then((settings) => {
        setScheduleAlarm(settings.scheduleAlarm);
        setPushAlarm(settings.pushAlarm);
        setRemindOneDayBefore(settings.remindOneDayBefore);
        setRemindOneDayBeforeTime(settings.remindOneDayBeforeTime);
        setRemindSameDay(settings.remindSameDay);
        setRemindSameDayTime(settings.remindSameDayTime);
        setImportantAlarm(settings.importantAlarm);
        setImportantAlarmTime(settings.importantAlarmTime);
      })
      .catch(() => undefined);
  }, []);

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ['images'],
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

    try {
      setAvatarUrl(asset.uri);
      setImageStatus('PROCESSING');
      const uploaded = await uploadProcessedImage('MEMBER', asset);
      await updateProfileMutation.mutateAsync({ imageId: uploaded.imageId });
      const processed = await waitForImageProcessing(uploaded.imageId);
      setImageStatus(processed.status);
      if (processed.status === 'COMPLETED' && processed.url) {
        setAvatarUrl(processed.url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.';
      setImageStatus(profile?.imageStatus);
      setAvatarUrl(profile?.avatarUrl);
      Alert.alert('업로드 실패', message);
    }
  };

  const saveNickname = async () => {
    if (!draftNickname.trim()) {
      setEditingNickname(false);
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({ nickname: draftNickname.trim() });
      setNickname(draftNickname.trim());
      setEditingNickname(false);
    } catch {
      Alert.alert('수정 실패', '닉네임 변경에 실패했습니다.');
    }
  };

  const updateSetting = async (
    key: 'scheduleAlarm' | 'pushAlarm' | 'remindOneDayBefore' | 'remindSameDay' | 'importantAlarm',
    value: boolean,
  ) => {
    try {
      await settingsApi.updateNotifications({ [key]: value });
    } catch {
      Alert.alert('저장 실패', '알림 설정 저장에 실패했습니다.');
      throw new Error('failed');
    }
  };

  return (
    <Screen>
      <PageHeader title="마이페이지" />

      <View style={styles.content}>
        <SectionCard>
          <View style={styles.profileSection}>
            <Pressable onPress={handleAvatarPick} style={styles.avatarButton}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{nickname.slice(0, 1) || 'T'}</Text>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Camera color={colors.card} size={16} />
              </View>
            </Pressable>

            {editingNickname ? (
              <View style={styles.nicknameEditor}>
                <AppTextInput value={draftNickname} onChangeText={setDraftNickname} maxLength={20} />
                <Pressable onPress={saveNickname} style={styles.iconAction}>
                  <Check color={colors.primary} size={16} />
                </Pressable>
                <Pressable onPress={() => setEditingNickname(false)} style={styles.iconAction}>
                  <X color={colors.mutedForeground} size={16} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => { setDraftNickname(nickname); setEditingNickname(true); }} style={styles.nicknameRow}>
                <Text style={styles.nickname}>{nickname}</Text>
                <Pencil color={colors.mutedForeground} size={14} />
              </Pressable>
            )}

            <Text style={styles.profileHint}>사진이나 닉네임을 탭하여 수정</Text>
            {imageStatus === 'PROCESSING' || imageStatus === 'FAILED' ? (
              <Text style={styles.processingHint}>{processingImageLabel(imageStatus)}</Text>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.settingHeader}>알림 설정</Text>
          <SettingRow label="일정 알림" desc="꺼두면 일정 알림센터와 리마인드가 생성되지 않습니다" value={scheduleAlarm} onChange={async (next) => {
            const previous = scheduleAlarm;
            setScheduleAlarm(next);
            try {
              await updateSetting('scheduleAlarm', next);
            } catch {
              setScheduleAlarm(previous);
            }
          }} />
          <SettingRow label="푸시 알림" desc="등록된 브라우저/PWA 구독으로 일정과 그룹 알림을 함께 받습니다" value={pushAlarm} onChange={async (next) => {
            const previous = pushAlarm;
            setPushAlarm(next);
            try {
              await updateSetting('pushAlarm', next);
            } catch {
              setPushAlarm(previous);
            }
          }} />
        </SectionCard>

        <SectionCard>
          <Text style={styles.settingHeader}>리마인드</Text>
          <SettingRow label="1일 전 리마인드" desc={formatReminderTime(remindOneDayBeforeTime)} value={remindOneDayBefore} onChange={async (next) => {
            if (!scheduleAlarm) return;
            const previous = remindOneDayBefore;
            setRemindOneDayBefore(next);
            try {
              await updateSetting('remindOneDayBefore', next);
            } catch {
              setRemindOneDayBefore(previous);
            }
          }} disabled={!scheduleAlarm} />
          <SettingRow label="당일 리마인드" desc={formatReminderTime(remindSameDayTime)} value={remindSameDay} onChange={async (next) => {
            if (!scheduleAlarm) return;
            const previous = remindSameDay;
            setRemindSameDay(next);
            try {
              await updateSetting('remindSameDay', next);
            } catch {
              setRemindSameDay(previous);
            }
          }} disabled={!scheduleAlarm} />
          <SettingRow label="중요 일정 알림" desc={`${formatReminderTime(importantAlarmTime)} 추가 알림`} value={importantAlarm} onChange={async (next) => {
            if (!scheduleAlarm) return;
            const previous = importantAlarm;
            setImportantAlarm(next);
            try {
              await updateSetting('importantAlarm', next);
            } catch {
              setImportantAlarm(previous);
            }
          }} disabled={!scheduleAlarm} />
        </SectionCard>

        <AppButton
          label="로그아웃"
          variant="secondary"
          onPress={async () => {
            await signOut();
          }}
        />
      </View>
    </Screen>
  );
}

function formatReminderTime(value: string) {
  const [hourText = '00', minuteText = '00'] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const period = hour >= 12 ? '오후' : '오전';
  const displayHour = hour % 12 || 12;
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
}

function SettingRow({
  label,
  desc,
  value,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.settingRow, disabled ? styles.settingRowDisabled : null]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <ToggleSwitch value={value} onChange={disabled ? () => undefined : onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
  },
  profileSection: {
    alignItems: 'center',
    gap: 14,
  },
  avatarButton: {
    width: 88,
    height: 88,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  avatarOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(27,32,48,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  nicknameEditor: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHint: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  processingHint: {
    marginTop: -8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  settingHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  settingRowDisabled: {
    opacity: 0.45,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  settingDesc: {
    marginTop: 2,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
