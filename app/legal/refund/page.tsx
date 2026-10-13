import LegalShell from "@/components/LegalShell";
export const metadata = { title: "환불 정책" };

export default function Refund() {
  return (
    <LegalShell title="환불 정책">
      <h2>무료 체험</h2>
      <p>가입 후 14일 동안은 요금이 청구되지 않습니다. 체험 종료 전에 해지하면 결제가 발생하지 않습니다.</p>
      <h2>정기결제 해지</h2>
      <p>결제 화면에서 언제든 해지를 예약할 수 있으며, 다음 결제일부터 결제되지 않습니다. 이미 결제한 기간은 끝날 때까지 이용할 수 있습니다.</p>
      <h2>환불</h2>
      <ul>
        <li>결제일로부터 7일 이내이고 해당 기간에 AI 일지 발송 이력이 없으면 전액 환불합니다.</li>
        <li>그 외에는 남은 일수에 비례한 금액을 환불합니다(일할 계산, 결제대행 수수료 제외 없음).</li>
        <li>환불 요청: {process.env.NEXT_PUBLIC_BIZ_EMAIL || "고객센터 이메일 미입력"}. 영업일 3일 이내 처리하며, 카드 취소는 카드사 사정에 따라 3~7영업일이 걸릴 수 있습니다.</li>
      </ul>
    </LegalShell>
  );
}
