import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-bold text-foreground">{title}</h2>
    <div className="text-xs leading-6 text-muted-foreground">{children}</div>
  </section>
);

const TermsPage: React.FC = () => {
  return (
    <MobileLayout hideNav>
      <PageHeader title="이용약관" showBack />
      <main className="px-5 py-5 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Timelink 이용약관</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            본 약관은 Timelink의 일정 관리, 그룹, 일정 조율, 알림 기능 이용 조건을 정합니다.
            본 약관은 2026년 6월 10일부터 적용됩니다.
          </p>
        </section>

        <Section title="1. 서비스 내용">
          <p>
            Timelink는 개인 일정 등록, 그룹 일정 공유, 일정 조율, 알림 기능을 제공합니다.
            운영 상황에 따라 기능의 일부가 변경되거나 중단될 수 있습니다.
          </p>
        </Section>

        <Section title="2. 계정과 로그인">
          <p>
            이용자는 소셜 로그인 또는 임시 로그인을 통해 서비스를 사용할 수 있습니다.
            이용자는 자신의 계정으로 발생한 활동을 관리해야 하며, 타인의 계정이나 그룹 초대 정보를 부정하게 사용해서는 안 됩니다.
          </p>
        </Section>

        <Section title="3. 이용자 콘텐츠">
          <p>
            이용자가 등록한 일정, 그룹, 이미지, 조율 응답의 책임은 이용자에게 있습니다.
            Timelink는 서비스 제공과 안정적 운영을 위해 필요한 범위에서 이용자 콘텐츠를 저장하고 표시할 수 있습니다.
          </p>
        </Section>

        <Section title="4. 금지 행위">
          <ul className="list-disc pl-4 space-y-1.5">
            <li>타인의 개인정보, 계정, 그룹 정보를 무단으로 이용하는 행위</li>
            <li>서비스 장애를 유발하거나 비정상적인 자동 요청을 반복하는 행위</li>
            <li>불법 정보, 악성 파일, 권리 침해 콘텐츠를 등록하는 행위</li>
            <li>서비스의 보안 또는 운영을 우회하려는 행위</li>
          </ul>
        </Section>

        <Section title="5. 알림">
          <p>
            이용자가 알림을 켜면 일정 리마인드와 그룹 활동 알림을 받을 수 있습니다.
            브라우저 또는 운영체제 권한을 철회하면 푸시 알림이 발송되지 않을 수 있습니다.
          </p>
        </Section>

        <Section title="6. 책임 제한">
          <p>
            Timelink는 일정 누락, 네트워크 장애, 외부 인증 제공자 오류, 이용자의 설정 오류로 발생한 손해에 대해
            법령상 책임이 인정되는 범위를 넘어서 책임지지 않습니다.
          </p>
        </Section>

        <Section title="7. 약관 변경">
          <p>
            약관이 변경되는 경우 서비스 화면 또는 공지 채널을 통해 안내합니다.
            중요한 변경은 적용 전에 합리적인 기간을 두고 고지합니다.
          </p>
        </Section>
      </main>
    </MobileLayout>
  );
};

export default TermsPage;
