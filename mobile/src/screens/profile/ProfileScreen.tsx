import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import { settingsApi, storageApi } from '../../services/api';

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [nickname, setNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [draftNickname, setDraftNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [scheduleAlarm, setScheduleAlarm] = useState(true);
  const [groupAlarm, setGroupAlarm] = useState(true);
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(true);
  const [remindOneDayBeforeTime, setRemindOneDayBeforeTime] = useState('22:00');
  const [remindSameDay, setRemindSameDay] = useState(true);
  const [remindSameDayTime, setRemindSameDayTime] = useState('08:00');
  const [importantAlarm, setImportantAlarm] = useState(true);
  const [importantAlarmTime, setImportantAlarmTime] = useState('08:00');

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '사용자');
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  useEffect(() => {
    settingsApi.getNotifications()
      .then((settings) => {
        setScheduleAlarm(settings.scheduleAlarm);
        setGroupAlarm(settings.groupAlarm);
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
    try {
      const uploaded = await storageApi.uploadProfileImage({
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await updateProfileMutation.mutateAsync({ avatarUrl: uploaded.url });
      setAvatarUrl(uploaded.url);
    } catch {
      Alert.alert('업로드 실패', '이미지 업로드에 실패했습니다.');
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

  const updateSetting = async (key: 'scheduleAlarm' | 'groupAlarm' | 'remindOneDayBefore' | 'remindSameDay' | 'importantAlarm', value: boolean) => {
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
                  <Text style={styles.avatarFallbackText}>👤</Text>
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
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.settingHeader}>알림 설정</Text>
          <SettingRow label="일정 알림" desc="일정 관련 알림을 받습니다" value={scheduleAlarm} onChange={async (next) => {
            const previous = scheduleAlarm;
            setScheduleAlarm(next);
            try {
              await updateSetting('scheduleAlarm', next);
            } catch {
              setScheduleAlarm(previous);
            }
          }} />
          <SettingRow label="그룹 알림" desc="그룹 일정 생성, 조율 시 알림" value={groupAlarm} onChange={async (next) => {
            const previous = groupAlarm;
            setGroupAlarm(next);
            try {
              await updateSetting('groupAlarm', next);
            } catch {
              setGroupAlarm(previous);
            }
          }} />
        </SectionCard>

        <SectionCard>
          <Text style={styles.settingHeader}>리마인드</Text>
          <SettingRow label="1일 전 리마인드" desc={formatReminderTime(remindOneDayBeforeTime)} value={remindOneDayBefore} onChange={async (next) => {
            const previous = remindOneDayBefore;
            setRemindOneDayBefore(next);
            try {
              await updateSetting('remindOneDayBefore', next);
            } catch {
              setRemindOneDayBefore(previous);
            }
          }} />
          <SettingRow label="당일 리마인드" desc={formatReminderTime(remindSameDayTime)} value={remindSameDay} onChange={async (next) => {
            const previous = remindSameDay;
            setRemindSameDay(next);
            try {
              await updateSetting('remindSameDay', next);
            } catch {
              setRemindSameDay(previous);
            }
          }} />
          <SettingRow label="중요 일정 알림" desc={`${formatReminderTime(importantAlarmTime)} 추가 알림`} value={importantAlarm} onChange={async (next) => {
            const previous = importantAlarm;
            setImportantAlarm(next);
            try {
              await updateSetting('importantAlarm', next);
            } catch {
              setImportantAlarm(previous);
            }
          }} />
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
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <ToggleSwitch value={value} onChange={onChange} />
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
    fontSize: 34,
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
