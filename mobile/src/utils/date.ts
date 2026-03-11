const KOR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function getDayLabel(dateLike: string | Date) {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  return KOR_DAYS[date.getDay()];
}

export function formatDate(dateLike: string | Date) {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatTime(dateLike: string | Date) {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTimeRange(startIso: string, endIso: string) {
  return `${formatDate(startIso)} · ${formatTime(startIso)} - ${formatTime(endIso)}`;
}

export function relativeDateLabel(dateIso: string) {
  const date = new Date(dateIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return `오늘 ${formatDate(target)}`;
  if (diffDays > 0) return `${diffDays}일 뒤 ${formatDate(target)}`;
  return `${Math.abs(diffDays)}일 전 ${formatDate(target)}`;
}

export function timeAgoLabel(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
