import { getParticipantDisplay } from '../ScheduleDetailSheet';

describe('getParticipantDisplay', () => {
  it('uses nickname when present', () => {
    expect(getParticipantDisplay({
      userId: 'user-1',
      nickname: '민수',
    })).toEqual({
      name: '민수',
      canOpenProfile: true,
    });
  });

  it('falls back to user id and disables empty ids', () => {
    expect(getParticipantDisplay({
      userId: 'withdrawn-user',
      nickname: '',
    })).toMatchObject({
      name: 'withdrawn-user',
      canOpenProfile: true,
    });

    expect(getParticipantDisplay({
      userId: '',
      nickname: '',
    })).toEqual({
      name: '참여자',
      canOpenProfile: false,
    });
  });
});
