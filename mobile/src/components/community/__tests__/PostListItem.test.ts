import { getPostListDisplay } from '../PostListItem';
import { CommunityPostResponse } from '../../../services/api';

const basePost: CommunityPostResponse = {
  id: 'post-1',
  title: '주말 러닝 공지',
  content: '토요일 오전에 천천히 달립니다.',
  authorUserId: 'user-1',
  authorNickname: '민수',
  authorAvatarUrl: undefined,
  likeCount: 3,
  commentCount: 2,
  likedByMe: false,
  mine: false,
  createdAt: new Date(Date.now() - 60_000).toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('getPostListDisplay', () => {
  it('keeps public post author, title, and content', () => {
    expect(getPostListDisplay(basePost)).toMatchObject({
      locked: false,
      authorName: '민수',
      title: '주말 러닝 공지',
      content: '토요일 오전에 천천히 달립니다.',
    });
  });

  it('uses anonymous author display', () => {
    expect(getPostListDisplay({ ...basePost, anonymous: true }).authorName).toBe('익명');
  });

  it('uses join nudge copy for locked member-only previews', () => {
    expect(getPostListDisplay({ ...basePost, locked: true, memberOnly: true })).toMatchObject({
      locked: true,
      title: '모임에만 공개된 게시물이에요',
      content: '가입하면 내용을 확인할 수 있어요.',
    });
  });
});
