import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Eye, Globe2, Tag, Users, X } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { SectionCard } from '../../components/common/SectionCard';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { useCreateGroup } from '../../hooks/useGroups';
import { uploadProcessedImage, validatePickedImage, type PickedImageAsset } from '../../utils/images';
import { GROUP_DESCRIPTION_MAX_LENGTH, GROUP_NAME_MAX_LENGTH } from '../../constants/textLimits';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

export function GroupFormScreen({ navigation }: Props) {
  const createGroupMutation = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [image, setImage] = useState<PickedImageAsset | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const isPublic = visibility === 'PUBLIC';

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.8,
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

    setPreview(asset.uri);
    setImage({
      uri: asset.uri,
      fileName: asset.fileName || `group-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
      fileSize: asset.fileSize,
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('입력 필요', '모임 이름을 입력해주세요.');
      return;
    }

    try {
      const uploadedImage = image ? await uploadProcessedImage('GROUP', image) : null;
      const created = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        visibility,
        imageId: uploadedImage?.imageId,
      });
      navigation.replace('GroupDetail', { id: created.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : '모임 생성 중 오류가 발생했습니다.';
      Alert.alert('생성 실패', message);
    }
  };

  return (
    <Screen>
      <PageHeader title="새 모임 만들기" showBack />

      <View style={styles.content}>
        <SectionCard>
          <Text style={styles.sectionTitle}>모임 사진</Text>
          <View style={styles.imageRow}>
            {preview ? (
              <View>
                <Image source={{ uri: preview }} style={styles.preview} />
                <Pressable onPress={() => { setPreview(null); setImage(null); }} style={styles.removeButton}>
                  <X color={colors.card} size={14} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handlePickImage} style={styles.imagePlaceholder}>
                <Camera color={colors.mutedForeground} size={20} />
                <Text style={styles.imagePlaceholderLabel}>사진 추가</Text>
              </Pressable>
            )}

            <Text style={styles.imageHint}>모임을 대표하는 사진을 추가하세요. 15MB 이하 이미지가 WebP로 처리됩니다.</Text>
          </View>
        </SectionCard>

        <SectionCard>
          <AppTextInput label="모임 이름" value={name} onChangeText={setName} maxLength={GROUP_NAME_MAX_LENGTH} placeholder="모임 이름을 입력하세요" />
          <Text style={styles.countLabel}>{name.length}/{GROUP_NAME_MAX_LENGTH}</Text>
          <View style={{ height: 14 }} />
          <AppTextInput
            label="모임 소개"
            value={description}
            onChangeText={setDescription}
            maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
            placeholder={isPublic
              ? '누가 참여하면 좋은지, 활동 방식과 승인 기준을 짧게 적어주세요'
              : '모임에 대한 간단한 소개를 입력하세요'}
            multiline
          />
          <Text style={styles.countLabel}>{description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}</Text>
          <View style={{ height: 14 }} />
          <Text style={styles.sectionTitle}>공개 여부</Text>
          <View style={styles.visibilityRow}>
            <Pressable onPress={() => setVisibility('PRIVATE')} style={[styles.visibilityChip, visibility === 'PRIVATE' ? styles.visibilityChipActive : null]}>
              <Text style={[styles.visibilityLabel, visibility === 'PRIVATE' ? styles.visibilityLabelActive : null]}>비공개</Text>
            </Pressable>
            <Pressable onPress={() => setVisibility('PUBLIC')} style={[styles.visibilityChip, visibility === 'PUBLIC' ? styles.visibilityChipActive : null]}>
              <Text style={[styles.visibilityLabel, visibility === 'PUBLIC' ? styles.visibilityLabelActive : null]}>공개</Text>
            </Pressable>
          </View>
          <Text style={styles.visibilityHint}>{isPublic ? '둘러보기에서 검색되고 가입요청을 받을 수 있어요.' : '초대 링크로만 참여할 수 있어요.'}</Text>
        </SectionCard>

        {isPublic ? (
          <>
            <SectionCard>
              <View style={styles.publicGuideHeader}>
                <View style={styles.publicGuideIcon}>
                  <Globe2 size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.publicGuideTitle}>공개 모임은 소개가 첫인상이에요</Text>
                  <Text style={styles.publicGuideText}>대상, 활동 방식, 온라인/오프라인 여부, 참여 규칙을 짧게 적어두면 가입 요청 판단이 쉬워집니다.</Text>
                </View>
              </View>
              <View style={styles.publicGuideTags}>
                {['대상', '활동 방식', '장소/온라인', '참여 규칙'].map((label) => (
                  <View key={label} style={styles.publicGuideTag}>
                    <Tag size={12} color={colors.primary} />
                    <Text style={styles.publicGuideTagText}>{label}</Text>
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard>
              <View style={styles.previewHeader}>
                <Eye size={16} color={colors.primary} />
                <Text style={styles.previewHeaderText}>둘러보기 미리보기</Text>
              </View>
              <View style={styles.publicPreviewRow}>
                {preview ? (
                  <Image source={{ uri: preview }} style={styles.publicPreviewImage} />
                ) : (
                  <View style={styles.publicPreviewFallback}>
                    <Camera color={colors.mutedForeground} size={18} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.publicPreviewTitleRow}>
                    <Text numberOfLines={1} style={styles.publicPreviewTitle}>{name.trim() || '모임 이름'}</Text>
                    <Text style={styles.publicBadge}>공개</Text>
                  </View>
                  <View style={styles.publicPreviewMeta}>
                    <Users size={12} color={colors.mutedForeground} />
                    <Text style={styles.publicPreviewMetaText}>멤버 1명 · 승인 후 참여</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.publicPreviewDescription}>
                    {description.trim() || '어떤 사람들이 어떤 방식으로 함께하는 모임인지 적으면 가입 요청이 더 쉬워집니다.'}
                  </Text>
                </View>
              </View>
            </SectionCard>
          </>
        ) : null}

        <SectionCard>
          <Text style={styles.tipTitle}>{isPublic ? '공개 모임 운영 팁' : '모임 생성 후'}</Text>
          <Text style={styles.tipText}>
            {isPublic
              ? '가입 요청은 관리자가 승인한 뒤 완료돼요. 첫 일정이나 시간 조율을 만들어두면 참여자가 이해하기 쉬워요.'
              : '멤버를 초대하고, 약속과 시간 조율을 함께 관리할 수 있어요.'}
          </Text>
        </SectionCard>

        <AppButton
          label={createGroupMutation.isPending ? '생성 중...' : '모임 만들기'}
          variant="group"
          loading={createGroupMutation.isPending}
          onPress={handleSubmit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 12,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  preview: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHint: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  countLabel: {
    marginTop: 8,
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.mutedForeground,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.categoryGroup,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityChipActive: {
    backgroundColor: colors.foreground,
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  visibilityLabelActive: {
    color: colors.card,
  },
  visibilityHint: {
    marginTop: 8,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  publicGuideHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  publicGuideIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicGuideTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.foreground,
  },
  publicGuideText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  publicGuideTags: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  publicGuideTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  publicGuideTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  previewHeaderText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },
  publicPreviewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  publicPreviewImage: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
  },
  publicPreviewFallback: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicPreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  publicPreviewTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '900',
    color: colors.foreground,
  },
  publicBadge: {
    borderRadius: 999,
    backgroundColor: colors.primary + '12',
    color: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '800',
  },
  publicPreviewMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  publicPreviewMetaText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  publicPreviewDescription: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
});
