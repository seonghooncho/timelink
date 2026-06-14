import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { AppButton } from '../common/AppButton';
import { AppTextInput } from '../common/AppTextInput';
import { colors, radius } from '../../constants/theme';
import { COMMUNITY_POST_CONTENT_MAX_LENGTH, COMMUNITY_POST_TITLE_MAX_LENGTH } from '../../constants/textLimits';
import { validatePickedImage, type PickedImageAsset } from '../../utils/images';

interface PostComposerModalProps {
  visible: boolean;
  title: string;
  submitLabel?: string;
  anonymous?: boolean;
  memberOnly?: boolean;
  showAnonymous?: boolean;
  showMemberOnly?: boolean;
  loading?: boolean;
  onAnonymousChange?: (value: boolean) => void;
  onMemberOnlyChange?: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; image?: PickedImageAsset | null }) => void;
}

export function PostComposerModal({
  visible,
  title,
  submitLabel = '작성하기',
  anonymous,
  memberOnly,
  showAnonymous,
  showMemberOnly,
  loading,
  onAnonymousChange,
  onMemberOnlyChange,
  onClose,
  onSubmit,
}: PostComposerModalProps) {
  const [postTitle, setPostTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<PickedImageAsset | null>(null);

  useEffect(() => {
    if (!visible) {
      setPostTitle('');
      setContent('');
      setImage(null);
    }
  }, [visible]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.86,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const validation = validatePickedImage(asset);
    if (validation) {
      Alert.alert('이미지 확인 필요', validation);
      return;
    }
    setImage(asset);
  };

  const handleSubmit = () => {
    const trimmedTitle = postTitle.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      Alert.alert('입력 필요', '제목을 입력해주세요.');
      return;
    }
    if (!trimmedContent) {
      Alert.alert('입력 필요', '내용을 입력해주세요.');
      return;
    }
    onSubmit({ title: trimmedTitle, content: trimmedContent, image });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.optionRow}>
            {showAnonymous ? (
              <Pressable onPress={() => onAnonymousChange?.(!anonymous)} style={styles.optionChip}>
                <Text style={styles.optionLabel}>익명</Text>
                <View style={[styles.switchTrack, anonymous ? styles.switchTrackOn : null]}>
                  <View style={[styles.switchThumb, anonymous ? styles.switchThumbOn : null]} />
                </View>
              </Pressable>
            ) : null}
            {showMemberOnly ? (
              <Pressable onPress={() => onMemberOnlyChange?.(!memberOnly)} style={styles.optionChip}>
                <Text style={styles.optionLabel}>모임에만 게시</Text>
                <View style={[styles.switchTrack, memberOnly ? styles.switchTrackOnGroup : null]}>
                  <View style={[styles.switchThumb, memberOnly ? styles.switchThumbOn : null]} />
                </View>
              </Pressable>
            ) : null}
          </View>

          <AppTextInput
            label={`제목 ${postTitle.length}/${COMMUNITY_POST_TITLE_MAX_LENGTH}`}
            value={postTitle}
            onChangeText={setPostTitle}
            maxLength={COMMUNITY_POST_TITLE_MAX_LENGTH}
            placeholder="제목"
          />
          <AppTextInput
            label={`내용 ${content.length}/${COMMUNITY_POST_CONTENT_MAX_LENGTH}`}
            value={content}
            onChangeText={setContent}
            maxLength={COMMUNITY_POST_CONTENT_MAX_LENGTH}
            placeholder="내용"
            multiline
          />

          <Pressable onPress={handlePickImage} style={styles.imageButton}>
            <ImagePlus size={16} color={colors.primary} />
            <Text style={styles.imageButtonText}>{image ? '사진 변경하기' : '사진 등록하기'}</Text>
          </Pressable>
          {image ? <Image source={{ uri: image.uri }} style={styles.imagePreview} /> : null}

          <AppButton label={submitLabel} onPress={handleSubmit} loading={loading} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,32,48,0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    gap: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.foreground,
  },
  iconButton: {
    padding: 6,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  switchTrack: {
    width: 34,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.border,
    padding: 2,
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchTrackOnGroup: {
    backgroundColor: colors.categoryGroup,
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  switchThumbOn: {
    transform: [{ translateX: 14 }],
  },
  imageButton: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  imageButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  imagePreview: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
  },
});
