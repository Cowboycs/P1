import LegalShell from "@/components/LegalShell";
import { BIZ, show } from "@/lib/biz";
export const metadata = { title: "개인정보처리방침" };

export default function Privacy() {
  return (
    <LegalShell title="개인정보처리방침">
      <h2>1. 처리하는 개인정보</h2>
      <ul>
        <li><b>트레이너(이용자):</b> 이름, 이메일, 비밀번호(암호화), 소속, 연락처, 결제수단 정보(카드사·마스킹된 카드번호. 카드번호 원문은 결제대행사가 보관하며 회사는 저장하지 않음).</li>
        <li><b>트레이너가 등록한 회원(고객):</b> 이름, 휴대전화번호, 운동 목적, 나이·성별 등 프로필, 운동 기록, 컨디션 메모, 주의사항(건강정보 포함 가능).</li>
      </ul>
      <h2>2. 민감정보(건강정보)</h2>
      <p>회원의 부상 이력·통증·재활 목적 등은 개인정보 보호법상 민감정보에 해당할 수 있습니다. 서비스는 트레이너가 회원에게 별도 동의를 받았음을 확인한 경우에만 회원 등록을 허용하며, 동의 일시를 기록합니다.</p>
      <h2>3. 처리 목적</h2>
      <p>수업 일지 작성 및 전달, 회원 관리, 요금 결제, 고객 문의 대응.</p>
      <h2>4. 처리 위탁 및 국외 이전</h2>
      <table className="t">
        <thead><tr><th>수탁자</th><th>위탁 업무</th><th>이전 국가</th></tr></thead>
        <tbody>
          <tr><td>Supabase Inc.</td><td>데이터베이스·인증 호스팅</td><td>대한민국(서울 리전)</td></tr>
          <tr><td>Vercel Inc.</td><td>웹 서비스 호스팅</td><td>대한민국(서울 리전) 및 미국</td></tr>
          <tr><td>Anthropic PBC</td><td>AI 일지 초안 작성(운동 기록·목적·주의사항 전송)</td><td>미국</td></tr>
          <tr><td>(주)토스페이먼츠</td><td>정기결제 처리</td><td>대한민국</td></tr>
          <tr><td>솔라피(누리고)</td><td>카카오 알림톡·문자 발송</td><td>대한민국</td></tr>
        </tbody>
      </table>
      <h2>5. 보유 기간</h2>
      <p>회원 탈퇴 시 지체 없이 파기합니다. 다만 전자상거래법에 따라 결제 기록은 5년간 보관합니다.</p>
      <h2>6. 회원용 일지 링크</h2>
      <p>발송된 일지는 추측이 불가능한 고유 링크로만 열람할 수 있고 검색엔진에 노출되지 않습니다.</p>
      <h2>7. 개인정보 보호책임자</h2>
      <p>{BIZ.name} 대표 {show(BIZ.ceo, "성명 미입력")} · {show(BIZ.email, "이메일 미입력")}</p>
    </LegalShell>
  );
}
