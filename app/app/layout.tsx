import Link from "next/link";
import Nav from "@/components/Nav";
import BizFooter from "@/components/BizFooter";
import { getContext } from "@/lib/context";
import { daysLeft, fmtDate, isActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { trainer, sub } = await getContext();
  let banner: React.ReactNode = null;
  if (sub?.status === "trialing" && isActive(sub)) {
    const d = daysLeft(sub.trial_ends_at);
    banner = d <= 5 ? (
      <div className="banner info">무료 체험이 {d}일 남았습니다.{" "}
        {sub.card_summary ? `${fmtDate(sub.trial_ends_at)}에 등록한 카드로 첫 결제됩니다.` : <Link href="/app/billing">카드를 등록하면 끊김 없이 이어서 쓸 수 있습니다</Link>}
      </div>
    ) : null;
  } else if (sub?.status === "past_due") {
    banner = <div className="banner crit">구독 결제가 실패했습니다. <Link href="/app/billing">카드를 확인하거나 바꿔 주세요</Link>. 3일 안에 결제되지 않으면 이용이 중지됩니다.</div>;
  } else if (sub?.status === "active" && sub.cancel_at_period_end) {
    banner = <div className="banner warn">해지가 예약되어 {fmtDate(sub.current_period_end)}까지 이용할 수 있습니다. <Link href="/app/billing">다시 구독하기</Link></div>;
  }
  return (
    <>
      <Nav name={trainer?.name || "담당"} />
      <main className="wrap">
        {banner}
        {children}
        <BizFooter />
      </main>
    </>
  );
}
