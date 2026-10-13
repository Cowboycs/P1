import { getContext } from "@/lib/context";
import { supabaseAdmin } from "@/lib/supabase/admin";
import BillingClient from "@/components/BillingClient";
import { PLANS } from "@/lib/plans";
import { fmtDate, isActive, statusLabel } from "@/lib/subscription";

export const metadata = { title: "구독·결제" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ result?: string; msg?: string }> }) {
  const sp = await searchParams;
  const { sb, user, trainer, sub } = await getContext();
  // customerKey는 빌링키가 아니므로 화면에 넘겨도 되지만, 테이블은 서버 전용이라 서비스 키로 읽는다
  let customerKey = "";
  let configError: string | null = null;
  try {
    const { data } = await supabaseAdmin().from("billing_keys").select("customer_key").eq("trainer_id", user.id).single();
    customerKey = data?.customer_key ?? "";
  } catch (e) {
    configError = (e as Error).message;
  }
  const [{ data: payments }, { count: memberCount }] = await Promise.all([
    sb.from("payments").select("order_id,plan_id,amount,status,receipt_url,failure_reason,created_at,period_end").order("created_at", { ascending: false }).limit(24),
    sb.from("members").select("id", { count: "exact", head: true }).eq("archived", false),
  ]);
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
  const mode = clientKey.startsWith("live_") ? "live" : "test";

  if (!sub) return <div className="err">구독 정보를 찾을 수 없습니다. 고객센터로 문의해 주세요.</div>;

  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: 28, margin: 0 }}>구독·결제</h1>
      {sp.result === "ok" && <div className="ok">{sp.msg || "카드를 등록했습니다."}</div>}
      {sp.result === "fail" && <div className="err">{sp.msg || "카드 등록 또는 결제에 실패했습니다."}</div>}
      {configError && <div className="err">결제 설정이 끝나지 않았습니다: {configError}</div>}
      {mode === "test" && <div className="banner warn">테스트 모드입니다. 실제 카드로 결제되지 않으며, 토스페이먼츠 테스트 환경에서만 승인됩니다.</div>}

      <section className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="small muted">현재 상태</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{statusLabel(sub)}</div>
          </div>
          <div className="small" style={{ textAlign: "right" }}>
            {sub.status === "trialing" && <>체험 종료일 <b>{fmtDate(sub.trial_ends_at)}</b><br /></>}
            {sub.current_period_end && sub.status !== "trialing" && <>이용 기간 <b>{fmtDate(sub.current_period_end)}</b>까지<br /></>}
            결제 카드 <b>{sub.card_summary ?? "미등록"}</b>
          </div>
        </div>
        {!isActive(sub) && <p className="err" style={{ marginBottom: 0 }}>지금은 기능이 잠겨 있습니다. 요금제를 고르고 카드를 등록하면 바로 결제되고 이용이 재개됩니다.</p>}
      </section>

      <BillingClient
        plans={PLANS}
        current={sub.plan_id}
        status={sub.status}
        active={isActive(sub)}
        hasCard={!!sub.card_summary}
        cancelAtPeriodEnd={sub.cancel_at_period_end}
        memberCount={memberCount ?? 0}
        clientKey={clientKey}
        customerKey={customerKey}
        email={trainer?.email ?? user.email ?? ""}
        name={trainer?.name || trainer?.gym_name || ""}
        trialEnds={fmtDate(sub.trial_ends_at)}
      />

      <section className="panel">
        <h2 className="step-h">결제 내역</h2>
        {payments?.length ? (
          <div className="scroll-x">
            <table className="t">
              <thead><tr><th>일시</th><th>요금제</th><th>금액</th><th>상태</th><th>영수증</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.order_id}>
                    <td className="num">{new Date(p.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
                    <td>{PLANS.find((x) => x.id === p.plan_id)?.name ?? p.plan_id}</td>
                    <td className="num">{p.amount.toLocaleString("ko-KR")}원</td>
                    <td>{p.status === "paid" ? <span className="pill good">결제 완료</span> : <span className="pill crit" title={p.failure_reason ?? ""}>실패</span>}</td>
                    <td>{p.receipt_url ? <a href={p.receipt_url} target="_blank" rel="noreferrer">보기</a> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">아직 결제 내역이 없습니다.</div>}
      </section>
    </div>
  );
}
