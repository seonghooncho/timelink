import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
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

  it('renders public about page with product status and public links', () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Timelink 소개')).toBeInTheDocument();
    expect(screen.getByText(/운영 중인 web\/PWA 기반 MVP\/beta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Disquiet 제품 페이지/ })).toHaveAttribute(
      'href',
      'https://disquiet.io/product/timelink',
    );
    expect(screen.getByRole('link', { name: /GitHub 저장소/ })).toHaveAttribute(
      'href',
      'https://github.com/seonghooncho/timelink',
    );
  });

  it('renders public contact page with contact method and legal links', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Timelink 운영 문의')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contact@timelink.cloud' })).toHaveAttribute(
      'href',
      'mailto:contact@timelink.cloud',
    );
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
  });
});
