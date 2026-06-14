import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ExternalLink, Users } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import BrandMark from '@/components/common/BrandMark';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-bold text-foreground">{title}</h2>
    <div className="text-xs leading-6 text-muted-foreground">{children}</div>
  </section>
);

const AboutPage: React.FC = () => {
  return (
    <MobileLayout hideNav>
      <PageHeader title="Timelink 소개" showBack backTo="/login" />
      <main className="px-5 py-5 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <BrandMark size="sm" showWordmark />
          <p className="mt-4 text-sm font-bold leading-6 text-foreground">
            개인 일정은 한눈에 정리하고, 모임 시간은 함께 맞추는 일정 관리 및 모임 서비스
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Timelink는 개인 일정과 그룹 일정을 연결해 스터디, 팀 프로젝트, 동아리, 사이드프로젝트 팀이
            함께 가능한 시간을 빠르게 찾도록 돕습니다.
          </p>
        </section>

        <Section title="무엇을 하나요">
          <ul className="space-y-2">
            <li className="flex gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>개인 일정을 등록하고 하루 흐름을 한눈에 확인할 수 있습니다.</span>
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>모임 구성원의 가능 시간을 모아 회의, 스터디, 약속 시간을 조율할 수 있습니다.</span>
            </li>
          </ul>
        </Section>

        <Section title="누구를 위한 서비스인가요">
          <p>
            Timelink는 한국 대학생, 스터디 그룹, 팀 프로젝트, 동아리, 사이드프로젝트 팀, 작은 커뮤니티,
            친구 모임처럼 반복적으로 일정을 맞춰야 하는 그룹을 우선 대상으로 합니다.
          </p>
        </Section>

        <Section title="현재 상태">
          <p>
            Timelink는 현재 운영 중인 web/PWA 기반 MVP/beta입니다. 공개 제품 페이지는 Disquiet에 등록되어 있으며,
            서비스 개선과 초기 사용자 검증을 진행하고 있습니다.
          </p>
        </Section>

        <Section title="공개 링크">
          <div className="space-y-2">
            <a
              href="https://disquiet.io/product/timelink"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold text-foreground"
            >
              Disquiet 제품 페이지
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
            <a
              href="https://github.com/seonghooncho/timelink"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold text-foreground"
            >
              GitHub 저장소
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </Section>

        <div className="flex gap-2">
          <Link
            to="/contact"
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-xs font-bold text-primary-foreground"
          >
            문의하기
          </Link>
          <Link
            to="/demo"
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-center text-xs font-bold text-foreground"
          >
            둘러보기
          </Link>
        </div>
      </main>
    </MobileLayout>
  );
};

export default AboutPage;
