import { colors } from '../constants/theme';
import { ScheduleCategory } from '../types';

export function getCategoryLabel(category: string) {
  switch (category) {
    case 'task':
      return '할 일';
    case 'appointment':
      return '약속';
    case 'group':
      return '모임';
    case 'important':
      return '중요';
    case 'repeat':
      return '반복';
    default:
      return '일정';
  }
}

export function getCategoryPalette(category: ScheduleCategory | 'important') {
  switch (category) {
    case 'task':
      return { bg: colors.categoryTaskLight, fg: colors.categoryTaskStrong, solid: colors.categoryTask };
    case 'appointment':
      return { bg: colors.categoryAppointmentLight, fg: colors.categoryAppointmentStrong, solid: colors.categoryAppointment };
    case 'group':
      return { bg: colors.categoryGroupLight, fg: colors.categoryGroupStrong, solid: colors.categoryGroup };
    case 'repeat':
      return { bg: colors.categoryRepeatLight, fg: colors.categoryRepeatStrong, solid: colors.categoryRepeat };
    case 'important':
      return { bg: colors.categoryImportantLight, fg: colors.categoryImportantStrong, solid: colors.categoryImportant };
  }
}
