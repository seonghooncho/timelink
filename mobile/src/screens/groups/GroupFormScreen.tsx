import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

export function GroupFormScreen({ navigation }: Props) {
  const createGroupMutation = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<PickedImageAsset | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
      Alert.alert('입력 필요', '그룹 이름을 입력해주세요.');
      return;
    }

    try {
      const uploadedImage = image ? await uploadProcessedImage('GROUP', image) : null;
      const created = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        imageId: uploadedImage?.imageId,
      });
      navigation.replace('GroupDetail', { id: created.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : '그룹 생성 중 오류가 발생했습니다.';
      Alert.alert('생성 실패', message);
    }
  };

  return (
    <Screen>
      <PageHeader title="새 그룹 만들기" showBack />

      <View style={styles.content}>
        <SectionCard>
          <Text style={styles.sectionTitle}>그룹 사진</Text>
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

            <Text style={styles.imageHint}>그룹을 대표하는 사진을 추가하세요. 15MB 이하 이미지가 WebP로 처리됩니다.</Text>
          </View>
        </SectionCard>

        <SectionCard>
          <AppTextInput label="그룹 이름" value={name} onChangeText={setName} maxLength={30} placeholder="그룹 이름을 입력하세요" />
          <Text style={styles.countLabel}>{name.length}/30</Text>
          <View style={{ height: 14 }} />
          <AppTextInput
            label="그룹 설명"
            value={description}
            onChangeText={setDescription}
            maxLength={200}
            placeholder="그룹에 대한 간단한 설명을 입력하세요"
            multiline
          />
          <Text style={styles.countLabel}>{description.length}/200</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.tipTitle}>그룹 생성 후</Text>
          <Text style={styles.tipText}>• 그룹 상세 페이지에서 멤버를 초대할 수 있어요</Text>
          <Text style={styles.tipText}>• 공유 링크로 간편하게 초대가 가능해요</Text>
          <Text style={styles.tipText}>• 그룹 일정 조율 기능을 사용할 수 있어요</Text>
        </SectionCard>

        <AppButton
          label={createGroupMutation.isPending ? '생성 중...' : '그룹 만들기'}
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
});
