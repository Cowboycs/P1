import Link from "next/link";

export const metadata = { title: "카드 등록 실패" };

const MSG: Record<string, string> = {
  PAY_PROCESS_CANCELED: "카드 등록을 취소했습니다.",
  PAY_PROCESS_ABORTED: "카드 등록이 중단되었습니다. 다시 시도해 주세요.",
  REJECT_CARD_COMPANY: "카드사에서 등록을 거절했습니다. 다른 카드로 시도해 주세요.",
};

export default async function Fail({ searchParams }: { searchParams: Promise<{ code?: string; message?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="wrap">
      <div className="auth panel stack">
        <h1 style={{ margin: 0, fontSize: 20 }}>카드를 등록하지 못했습니다</h1>
        <p className="muted" style={{ margin: 0 }}>{(sp.code && MSG[sp.code]) || sp.message || "알 수 없는 오류가 발생했습니다."}</p>
        <Link href="/app/billing" className="btn primary">구독·결제로 돌아가기</Link>
      </div>
    </main>
  );
}
