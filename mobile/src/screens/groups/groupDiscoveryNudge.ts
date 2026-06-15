import { Group } from '../../types';

export function getDiscoverPreviewGroups(groups: Group[], limit = 3) {
  return groups.filter((group) => Boolean(group.id && group.name)).slice(0, Math.max(0, limit));
}
