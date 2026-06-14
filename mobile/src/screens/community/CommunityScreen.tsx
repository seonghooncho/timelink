import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, PenLine } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { PostComposerModal } from '../../components/community/PostComposerModal';
import { PostListItem } from '../../components/community/PostListItem';
import { colors, shadows } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { useCommunityPosts, useCreateCommunityPost } from '../../hooks/useCommunity';
import { communityApi } from '../../services/api';
import { uploadProcessedImage, type PickedImageAsset } from '../../utils/images';

export function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: posts = [], isLoading } = useCommunityPosts();
  const createPost = useCreateCommunityPost();
  const [composerOpen, setComposerOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const handleSubmit = async (data: { title: string; content: string; image?: PickedImageAsset | null }) => {
    try {
      const post = await createPost.mutateAsync({
        title: data.title,
        content: data.content,
        anonymous,
      });

      if (data.image) {
        const uploaded = await uploadProcessedImage('COMMUNITY_POST', data.image, post.id);
        await communityApi.updatePost(post.id, { imageId: uploaded.imageId });
      }

      setComposerOpen(false);
      setAnonymous(false);
      navigation.navigate('CommunityPostDetail', { postId: post.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : '게시글 작성에 실패했습니다.';
      Alert.alert('작성 실패', message);
    }
  };

  return (
    <Screen>
      <PageHeader
        title="커뮤니티"
        rightElement={(
          <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
            <Bell color={colors.mutedForeground} size={20} />
          </Pressable>
        )}
      />

      <View style={styles.content}>
        {isLoading ? (
          <LoadingState />
        ) : posts.length === 0 ? (
          <EmptyState title="아직 게시글이 없습니다" description="가볍게 첫 이야기를 남겨보세요" />
        ) : (
          posts.map((post) => (
            <PostListItem
              key={post.id}
              post={post}
              onPress={() => navigation.navigate('CommunityPostDetail', { postId: post.id })}
              onAuthorPress={() => Alert.alert('프로필', '작성자의 공개 프로필은 게시글 상세에서 확인할 수 있습니다.')}
            />
          ))
        )}
      </View>

      <Pressable onPress={() => setComposerOpen(true)} style={styles.writeButton}>
        <PenLine color={colors.primaryForeground} size={18} />
        <Text style={styles.writeButtonText}>글쓰기</Text>
      </Pressable>

      <PostComposerModal
        visible={composerOpen}
        title="커뮤니티 글쓰기"
        anonymous={anonymous}
        showAnonymous
        onAnonymousChange={setAnonymous}
        loading={createPost.isPending}
        onClose={() => setComposerOpen(false)}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  writeButton: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  writeButtonText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
});
