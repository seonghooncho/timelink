import { getDiscoverPreviewGroups } from '../groupDiscoveryNudge';
import { Group } from '../../../types';

const baseGroup: Group = {
  id: 'group-1',
  name: '주말 러닝',
  description: '가볍게 뛰는 모임',
  memberCount: 4,
  myRole: '',
  visibility: 'PUBLIC',
  createdAt: '2026-06-15T00:00:00Z',
};

describe('getDiscoverPreviewGroups', () => {
  it('keeps only valid groups and caps the preview count', () => {
    expect(getDiscoverPreviewGroups([
      baseGroup,
      { ...baseGroup, id: '', name: '깨진 모임' },
      { ...baseGroup, id: 'group-2', name: '' },
      { ...baseGroup, id: 'group-3', name: '독서 모임' },
      { ...baseGroup, id: 'group-4', name: '아침 산책' },
      { ...baseGroup, id: 'group-5', name: '보드게임' },
    ])).toEqual([
      baseGroup,
      { ...baseGroup, id: 'group-3', name: '독서 모임' },
      { ...baseGroup, id: 'group-4', name: '아침 산책' },
    ]);
  });

  it('treats negative preview limits as empty', () => {
    expect(getDiscoverPreviewGroups([baseGroup], -1)).toEqual([]);
  });
});
