import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';

const CONTACT_EMAIL = 'contact@timelink.cloud';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-bold text-foreground">{title}</h2>
    <div className="text-xs leading-6 text-muted-foreground">{children}</div>
  </section>
);

const ContactPage: React.FC = () => {
  return (
    <MobileLayout hideNav>
      <PageHeader title="문의" showBack backTo="/login" />
      <main className="px-5 py-5 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Timelink 운영 문의</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 block break-all text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        <Section title="문의 범위">
          <p>
            서비스 이용 문의, 개인정보 열람·정정·삭제 요청, 모임 운영 관련 문제, 제품 제안은 위 이메일로 접수합니다.
            요청을 처리할 때 필요한 경우 본인 확인을 요청할 수 있습니다.
          </p>
        </Section>

        <Section title="서비스 정보">
          <p>
            Timelink는 개인 일정과 모임 시간 조율을 돕는 운영 중인 web/PWA 서비스입니다.
            현재 MVP/beta 단계에서 초기 사용자 피드백을 반영하고 있습니다.
          </p>
        </Section>

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/privacy"
            className="rounded-xl border border-border bg-card px-4 py-3 text-center text-xs font-bold text-foreground"
          >
            개인정보처리방침
          </Link>
          <Link
            to="/terms"
            className="rounded-xl border border-border bg-card px-4 py-3 text-center text-xs font-bold text-foreground"
          >
            이용약관
          </Link>
        </div>
      </main>
    </MobileLayout>
  );
};

export default ContactPage;
