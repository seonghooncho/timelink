const PrivacyPolicyPage = () => (
  <div className="max-w-2xl mx-auto px-6 py-12 text-sm text-gray-700">
    <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>
    <p className="mb-4">
      Timelink(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 및 관련 법령에 따라 개인정보를 처리합니다.
    </p>

    <h2 className="text-lg font-semibold mt-8 mb-2">1. 수집하는 개인정보 항목</h2>
    <ul className="list-disc pl-6 mb-4 space-y-1">
      <li>소셜 로그인(Google, Kakao) 시 제공되는 이메일 주소, 프로필 이름, 프로필 사진</li>
      <li>서비스 이용 과정에서 생성되는 일정, 그룹 정보</li>
      <li>서비스 접속 기록, 기기 정보(앱 이용 시)</li>
    </ul>

    <h2 className="text-lg font-semibold mt-8 mb-2">2. 개인정보 수집 및 이용 목적</h2>
    <ul className="list-disc pl-6 mb-4 space-y-1">
      <li>회원 식별 및 서비스 제공</li>
      <li>일정 조율 및 그룹 기능 운영</li>
      <li>서비스 개선 및 오류 분석</li>
    </ul>

    <h2 className="text-lg font-semibold mt-8 mb-2">3. 개인정보 보유 및 이용 기간</h2>
    <p className="mb-4">
      회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.
    </p>

    <h2 className="text-lg font-semibold mt-8 mb-2">4. 제3자 제공</h2>
    <p className="mb-4">
      수집한 개인정보는 원칙적으로 제3자에게 제공하지 않습니다. 다만, 이용자의 동의가 있거나 법령에 의한 경우는 예외로 합니다.
    </p>

    <h2 className="text-lg font-semibold mt-8 mb-2">5. 개인정보 처리 위탁</h2>
    <p className="mb-4">
      서비스 운영을 위해 아래 업체에 개인정보 처리를 위탁합니다.
    </p>
    <ul className="list-disc pl-6 mb-4 space-y-1">
      <li>Amazon Web Services (서버 인프라 운영)</li>
      <li>Google LLC (소셜 로그인)</li>
      <li>Kakao Corp. (소셜 로그인)</li>
    </ul>

    <h2 className="text-lg font-semibold mt-8 mb-2">6. 이용자 권리</h2>
    <p className="mb-4">
      이용자는 개인정보 열람, 수정, 삭제를 요청할 수 있으며, 서비스 내 계정 설정 또는 이메일을 통해 행사할 수 있습니다.
    </p>

    <h2 className="text-lg font-semibold mt-8 mb-2">7. 문의</h2>
    <p className="mb-4">
      개인정보 관련 문의는 아래로 연락하시기 바랍니다.<br />
      이메일: <a href="mailto:imalex124@gmail.com" className="text-blue-600 underline">imalex124@gmail.com</a>
    </p>

    <p className="mt-10 text-xs text-gray-400">최종 수정일: 2026년 3월 13일</p>
  </div>
);

export default PrivacyPolicyPage;
