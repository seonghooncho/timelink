import type { Schedule } from '@/types/types';

export interface DemoMember {
  id: string;
  name: string;
  role: string;
}

export interface DemoCoordinationSlot {
  date: string;
  hour: number;
  voterIds: string[];
}

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeLocalDate = (base: Date, dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(base);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

export const createDemoSchedules = (now = new Date()): Schedule[] => [
  {
    id: 'demo-past-retro',
    title: '지난 팀 회고',
    content: '지난 일정도 옆으로 넘겨 확인할 수 있습니다.',
    category: 'group',
    isImportant: false,
    startTime: makeLocalDate(now, -1, 19).toISOString(),
    duration: 1,
    isCompleted: true,
    hasAlarm: false,
    groupId: 'demo-group',
  },
  {
    id: 'demo-focus-doc',
    title: '기획안 마감',
    content: '중요 일정은 카드와 알림에서 더 눈에 띄게 관리합니다.',
    category: 'task',
    isImportant: true,
    startTime: makeLocalDate(now, 0, 13).toISOString(),
    duration: 1.5,
    isCompleted: false,
    hasAlarm: true,
  },
  {
    id: 'demo-team-sync',
    title: '팀 싱크 미팅',
    content: '겹치는 일정도 타임테이블에서 블록으로 구분됩니다.',
    category: 'group',
    isImportant: false,
    startTime: makeLocalDate(now, 0, 15).toISOString(),
    duration: 1,
    isCompleted: false,
    hasAlarm: true,
    groupId: 'demo-group',
  },
  {
    id: 'demo-dinner',
    title: '저녁 약속',
    content: '개인 일정과 그룹 일정을 한 화면에서 같이 봅니다.',
    category: 'appointment',
    isImportant: false,
    startTime: makeLocalDate(now, 0, 19).toISOString(),
    duration: 2,
    isCompleted: false,
    hasAlarm: false,
  },
  {
    id: 'demo-weekend-plan',
    title: '주말 장소 확정',
    content: '조율 결과를 그룹 일정으로 확정하는 흐름을 보여줍니다.',
    category: 'group',
    isImportant: false,
    startTime: makeLocalDate(now, 2, 14).toISOString(),
    duration: 1,
    isCompleted: false,
    hasAlarm: true,
    groupId: 'demo-group',
  },
];

export const demoMembers: DemoMember[] = [
  { id: 'demo-member-1', name: '민지', role: '관리자' },
  { id: 'demo-member-2', name: '준호', role: '멤버' },
  { id: 'demo-member-3', name: '서연', role: '멤버' },
  { id: 'demo-member-4', name: '도윤', role: '멤버' },
  { id: 'demo-member-5', name: '하린', role: '멤버' },
  { id: 'demo-member-6', name: '지우', role: '멤버' },
];

export const createDemoCoordination = (now = new Date()) => {
  const dates = [0, 1, 2].map((offset) => toDateKey(makeLocalDate(now, offset, 0)));
  const slots: DemoCoordinationSlot[] = [
    { date: dates[0], hour: 18, voterIds: ['demo-member-1', 'demo-member-2', 'demo-member-4'] },
    { date: dates[0], hour: 19, voterIds: ['demo-member-1', 'demo-member-2', 'demo-member-3', 'demo-member-4'] },
    { date: dates[0], hour: 20, voterIds: ['demo-member-1', 'demo-member-3'] },
    { date: dates[1], hour: 18, voterIds: ['demo-member-2', 'demo-member-4', 'demo-member-5'] },
    { date: dates[1], hour: 19, voterIds: ['demo-member-1', 'demo-member-2', 'demo-member-3', 'demo-member-4', 'demo-member-5'] },
    { date: dates[1], hour: 20, voterIds: ['demo-member-1', 'demo-member-2', 'demo-member-3', 'demo-member-4', 'demo-member-5'] },
    { date: dates[2], hour: 18, voterIds: ['demo-member-1', 'demo-member-6'] },
    { date: dates[2], hour: 19, voterIds: ['demo-member-2', 'demo-member-3', 'demo-member-6'] },
    { date: dates[2], hour: 20, voterIds: ['demo-member-3', 'demo-member-4', 'demo-member-5'] },
  ];

  return {
    title: '주말 모임 시간 정하기',
    dates,
    hours: [18, 19, 20],
    slots,
    recommended: slots[4],
  };
};
