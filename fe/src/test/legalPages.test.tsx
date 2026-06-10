import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsPage from '@/pages/TermsPage';

describe('legal pages', () => {
  it('renders privacy policy with required collection and retention notices', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Timelink 개인정보처리방침')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /수집하는 개인정보/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /보유 및 이용 기간/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /제3자 제공 및 처리위탁/ })).toBeInTheDocument();
  });

  it('renders terms of service with account, notification, and prohibited conduct notices', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Timelink 이용약관')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /계정과 로그인/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /금지 행위/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /알림/ })).toBeInTheDocument();
  });
});
