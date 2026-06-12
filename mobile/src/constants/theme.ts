export const colors = {
  background: '#f8f7f4',
  foreground: '#1b2030',
  card: '#ffffff',
  primary: '#33a37d',
  primaryForeground: '#ffffff',
  muted: '#f1f2f5',
  mutedForeground: '#7c8191',
  border: '#e7e8ee',
  destructive: '#d64545',
  shadow: 'rgba(27, 32, 48, 0.08)',
  shadowStrong: 'rgba(27, 127, 245, 0.14)',
  categoryTask: '#5d84db',
  categoryTaskLight: '#edf2fd',
  categoryTaskStrong: '#3563bf',
  categoryAppointment: '#42a98b',
  categoryAppointmentLight: '#edf7f3',
  categoryAppointmentStrong: '#2c7a61',
  categoryImportant: '#d65a5a',
  categoryImportantLight: '#fceded',
  categoryImportantStrong: '#b04040',
  categoryGroup: '#8f6ecb',
  categoryGroupLight: '#f1edfa',
  categoryGroupStrong: '#6f4cad',
  categoryRepeat: '#d19248',
  categoryRepeatLight: '#fbf2e9',
  categoryRepeatStrong: '#ad6d2b',
  coordGray: '#6b7282',
  coordGreen: '#2f8c68',
  coordBlue: '#2d64c9',
  coordBest: '#efb524',
} as const;

export const spacing = {
  screen: 20,
  card: 16,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const shadows = {
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  brand: {
    shadowColor: colors.shadowStrong,
    shadowOpacity: 1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;

export const typography = {
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: colors.foreground,
  },
  caption: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
} as const;

export const timetable = {
  hourStart: 0,
  hourEnd: 24,
  defaultVisibleHour: 7,
  hourHeight: 56,
} as const;
