import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { issueBillingKey } from "@/lib/toss";
import { chargeTrainer } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import { isActive, type Subscription } from "@/lib/subscription";

export const maxDuration = 60;

function back(req: Request, result: "ok" | "fail", msg: string) {
  const u = new URL("/app/billing", req.url);
  u.searchParams.set("result", result);
  u.searchParams.set("msg", msg);
  return NextResponse.redirect(u);
}

/** 토스 카드 등록 창 성공 후 돌아오는 주소: ?customerKey=&authKey=&plan= */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const authKey = url.searchParams.get("authKey");
  const customerKey = url.searchParams.get("customerKey");
  const planId = url.searchParams.get("plan") ?? "pro";
  if (!authKey || !customerKey) return back(req, "fail", "카드 등록 정보가 올바르지 않습니다.");
  if (!PLANS.some((p) => p.id === planId)) return back(req, "fail", "알 수 없는 요금제입니다.");

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login?next=/app/billing", req.url));

  const admin = supabaseAdmin();
  const { data: key } = await admin.from("billing_keys").select("customer_key").eq("trainer_id", auth.user.id).single();
  // 다른 사람의 customerKey로 등록 시도 차단
  if (!key || key.customer_key !== customerKey) return back(req, "fail", "카드 등록 요청을 확인할 수 없습니다.");

  // 회원 수가 고른 요금제 한도를 넘으면 거절
  const plan = PLANS.find((p) => p.id === planId)!;
  if (plan.limit !== null) {
    const { count } = await admin.from("members").select("id", { count: "exact", head: true }).eq("trainer_id", auth.user.id).eq("archived", false);
    if ((count ?? 0) > plan.limit) return back(req, "fail", `회원이 ${count}명이라 ${plan.name} 요금제를 선택할 수 없습니다.`);
  }

  const issued = await issueBillingKey(authKey, customerKey);
  if (!issued.ok) return back(req, "fail", `카드 등록 실패: ${issued.error.message}`);

  const card = issued.data.card;
  const cardSummary = [card?.cardType ? `${card.cardType}카드` : "카드", card?.number].filter(Boolean).join(" ");
  await admin.from("billing_keys").update({ billing_key: issued.data.billingKey }).eq("trainer_id", auth.user.id);

  const { data: sub } = await admin.from("subscriptions").select("*").eq("trainer_id", auth.user.id).single();
  await admin.from("subscriptions").update({
    plan_id: plan.id, card_summary: cardSummary, cancel_at_period_end: false, updated_at: new Date().toISOString(),
  }).eq("trainer_id", auth.user.id);

  const s = sub as Subscription;
  const inTrial = s.status === "trialing" && isActive(s);
  const paidPeriodRunning = s.status === "active" && isActive(s);
  if (inTrial) return back(req, "ok", "카드를 등록했습니다. 체험이 끝나는 날 첫 결제가 진행됩니다.");
  if (paidPeriodRunning) return back(req, "ok", "결제 카드를 변경했습니다. 다음 결제일부터 이 카드로 결제됩니다.");

  // 체험 종료·해지·결제 실패 상태 → 즉시 결제해서 바로 재개
  const charged = await chargeTrainer(admin, auth.user.id);
  if (!charged.ok) return back(req, "fail", `카드는 등록됐지만 결제에 실패했습니다: ${charged.reason}`);
  return back(req, "ok", `${plan.name} 요금제 결제가 완료되었습니다. 바로 이용할 수 있습니다.`);
}
