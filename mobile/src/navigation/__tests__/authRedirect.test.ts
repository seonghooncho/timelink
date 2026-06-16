jest.mock('../../services/session', () => ({
  clearStoredSession: jest.fn(),
}));

import { parseAuthCallbackUrl } from '../authRedirect';

describe('auth redirect parsing', () => {
  it('parses refresh token from native OAuth callback fragments', () => {
    expect(parseAuthCallbackUrl('timelink://app/auth/callback#accessToken=at&refreshToken=rt&userId=google_1&redirect=%2Fgroups')).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      userId: 'google_1',
      redirect: '/groups',
      error: '',
      message: '',
    });
  });

  it('keeps refresh token empty for legacy callback payloads', () => {
    expect(parseAuthCallbackUrl('timelink://app/auth/callback#accessToken=at&userId=google_1')).toMatchObject({
      accessToken: 'at',
      refreshToken: '',
      userId: 'google_1',
    });
  });
});
