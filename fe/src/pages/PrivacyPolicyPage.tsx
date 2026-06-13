import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-bold text-foreground">{title}</h2>
    <div className="text-xs leading-6 text-muted-foreground">{children}</div>
  </section>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <MobileLayout hideNav>
      <PageHeader title="개인정보처리방침" showBack />
      <main className="px-5 py-5 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Timelink 개인정보처리방침</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Timelink는 개인 일정과 그룹 일정 조율을 제공하기 위해 필요한 최소한의 개인정보를 처리합니다.
            본 방침은 2026년 6월 10일부터 적용됩니다.
          </p>
        </section>

        <Section title="1. 수집하는 개인정보">
          <ul className="list-disc pl-4 space-y-1.5">
            <li>공통: 사용자 식별자, 닉네임, 프로필 이미지, 생성·수정 시각</li>
            <li>소셜 로그인: 제공자가 전달한 계정 식별자, 동의한 경우 닉네임과 프로필 이미지</li>
            <li>서비스 이용 정보: 일정, 그룹, 그룹원, 일정 조율 응답, 알림 설정, 앱 사용 중 생성한 이미지 URL</li>
            <li>푸시 알림 사용 시: 브라우저 푸시 구독 endpoint, 공개키, 인증키, user agent</li>
            <li>서비스 이용 분석: 페이지 조회, 버튼 클릭 등 이벤트 정보, 접속 환경, 대략적인 유입 정보</li>
          </ul>
        </Section>

        <Section title="2. 이용 목적">
          <ul className="list-disc pl-4 space-y-1.5">
            <li>로그인 상태 유지와 사용자 식별</li>
            <li>개인·그룹 일정 관리, 일정 조율, 그룹원 표시</li>
            <li>일정 리마인드, 그룹 활동, 중요 일정에 대한 알림 제공</li>
            <li>서비스 사용 흐름 분석과 기능 개선</li>
            <li>서비스 안정성 확인, 오류 대응, 부정 이용 방지</li>
          </ul>
        </Section>

        <Section title="3. 보유 및 이용 기간">
          <p>
            회원 정보와 서비스 이용 정보는 계정 또는 관련 데이터 삭제 요청 시까지 보관합니다.
            법령상 보관 의무가 있거나 분쟁 대응이 필요한 정보는 필요한 기간 동안 별도로 보관할 수 있습니다.
            푸시 구독 정보는 알림 해제 또는 구독 만료 시 삭제합니다.
          </p>
        </Section>

        <Section title="4. 제3자 제공 및 처리위탁">
          <p>
            Timelink는 이용자의 개인정보를 별도 동의 없이 제3자에게 판매하거나 제공하지 않습니다.
            서비스 운영을 위해 클라우드 인프라, 인증 제공자, 콘텐츠 전송망 등 외부 서비스를 사용할 수 있으며,
            이 경우 서비스 제공에 필요한 범위에서만 처리합니다.
            서비스 이용 분석에는 Google Analytics를 사용할 수 있으며, 분석 이벤트에는 이름, 이메일, 소셜 로그인 원본 식별자,
            일정 제목과 같은 직접 식별 가능 정보나 사용자가 입력한 본문을 포함하지 않습니다.
          </p>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>
            이용자는 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.
            앱 내 계정 또는 프로필 기능에서 직접 수정할 수 없는 사항은 운영자에게 요청할 수 있습니다.
          </p>
        </Section>

        <Section title="6. 안전성 확보 조치">
          <p>
            Timelink는 접근 권한 관리, 전송 구간 보호, 인증 토큰 관리, 운영 로그 점검 등 합리적인 보호 조치를 적용합니다.
            민감정보와 고유식별정보는 서비스 목적상 수집하지 않습니다.
          </p>
        </Section>

        <Section title="7. 문의">
          <p>
            개인정보 관련 문의와 삭제 요청은 서비스 운영자가 안내한 문의 채널을 통해 접수합니다.
            접수된 요청은 본인 확인 후 처리합니다.
          </p>
        </Section>
      </main>
    </MobileLayout>
  );
};

export default PrivacyPolicyPage;
