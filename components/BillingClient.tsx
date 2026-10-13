"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { won } from "@/lib/plans";

type Plan = { id: string; name: string; price: number; limit: number | null; blurb: string };

export default function BillingClient(p: {
  plans: Plan[]; current: string; status: string; active: boolean; hasCard: boolean; cancelAtPeriodEnd: boolean;
  memberCount: number; clientKey: string; customerKey: string; email: string; name: string; trialEnds: string;
}) {
  const router = useRouter();
  const [pick, setPick] = useState(p.current);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const plan = p.plans.find((x) => x.id === pick)!;
  const tooSmall = plan.limit !== null && p.memberCount > plan.limit;

  async function registerCard() {
    setErr(null);
    if (!p.clientKey || !p.customerKey) return setErr("결제 키가 설정되지 않았습니다. 관리자에게 문의해 주세요.");
    if (tooSmall) return setErr(`현재 회원 ${p.memberCount}명이라 ${plan.name} 요금제(최대 ${plan.limit}명)를 선택할 수 없습니다.`);
    setBusy("card");
    try {
      const toss = await loadTossPayments(p.clientKey);
      const payment = toss.payment({ customerKey: p.customerKey });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${location.origin}/billing/success?plan=${pick}`,
        failUrl: `${location.origin}/billing/fail`,
        customerEmail: p.email || undefined,
        customerName: p.name || undefined,
      });
    } catch (e: any) {
      if (e?.code !== "USER_CANCEL") setErr(e?.message ?? "카드 등록 창을 열지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function changePlan() {
    setErr(null); setBusy("plan");
    const res = await fetch("/api/billing/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: pick }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setErr(j.error ?? "요금제를 바꾸지 못했습니다.");
    router.refresh();
  }

  async function setCancel(cancel: boolean) {
    setErr(null); setBusy("cancel");
    const res = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancel }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null); setConfirmCancel(false);
    if (!res.ok) return setErr(j.error ?? "처리하지 못했습니다.");
    router.refresh();
  }

  const needsCharge = !p.active || p.status === "past_due";
  return (
    <section className="panel stack">
      <h2 className="step-h" style={{ margin: 0 }}>요금제</h2>
      <div className="pricing">
        {p.plans.map((x) => {
          const disabled = x.limit !== null && p.memberCount > x.limit;
          return (
            <button key={x.id} className="plan" data-pick={x.id === pick} onClick={() => setPick(x.id)} style={{ textAlign: "left", opacity: disabled ? 0.5 : 1 }} aria-pressed={x.id === pick}>
              <b>{x.name}{x.id === p.current && <span className="pill good" style={{ marginLeft: 6 }}>현재</span>}</b>
              <span className="price">{won(x.price)}<small> / 월</small></span>
              <span className="small muted">회원 {x.limit ? `${x.limit}명까지` : "무제한"} · {x.blurb}</span>
              {disabled && <span className="small" style={{ color: "var(--crit)" }}>현재 회원 수({p.memberCount}명)보다 작음</span>}
            </button>
          );
        })}
      </div>

      {err && <div className="err">{err}</div>}

      <div className="row">
        {(!p.hasCard || needsCharge) ? (
          <button className="btn primary" onClick={registerCard} disabled={busy !== null || tooSmall}>
            {busy === "card" ? "여는 중…" : needsCharge ? `카드 등록하고 ${won(plan.price)} 결제` : "카드 등록하기"}
          </button>
        ) : (
          <>
            {pick !== p.current && <button className="btn primary" onClick={changePlan} disabled={busy !== null || tooSmall}>{busy === "plan" ? "변경 중…" : `${plan.name} 요금제로 변경`}</button>}
            <button className="btn ghost" onClick={registerCard} disabled={busy !== null}>결제 카드 변경</button>
          </>
        )}
      </div>
      <p className="hint">
        {p.status === "trialing" && !needsCharge
          ? `체험 기간에는 결제되지 않습니다. 카드를 등록해 두면 ${p.trialEnds}에 선택한 요금제로 첫 결제되고, 이후 매월 같은 날 자동 결제됩니다.`
          : "요금제 변경은 다음 결제일부터 적용됩니다. 회원 수 한도는 바로 적용됩니다."}
      </p>

      {p.hasCard && p.active && p.status !== "past_due" && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          {p.cancelAtPeriodEnd ? (
            <div className="row"><span className="small">해지가 예약되어 있습니다. 다음 결제일에 결제되지 않습니다.</span><button className="btn ghost" onClick={() => setCancel(false)} disabled={busy !== null}>해지 취소</button></div>
          ) : confirmCancel ? (
            <div className="row"><span className="small">다음 결제일부터 결제를 멈춥니다. 남은 기간은 계속 이용할 수 있습니다.</span>
              <button className="btn danger" onClick={() => setCancel(true)} disabled={busy !== null}>해지 예약 확정</button>
              <button className="btn ghost" onClick={() => setConfirmCancel(false)}>돌아가기</button></div>
          ) : (
            <button className="sbtn" onClick={() => setConfirmCancel(true)}>구독 해지</button>
          )}
        </div>
      )}
    </section>
  );
}
