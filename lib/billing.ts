import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chargeBillingKey, newOrderId } from "./toss";
import { planById } from "./plans";

const MAX_ATTEMPTS = 3;

function addMonth(from: Date) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() < day) d.setDate(0); // 1/31 → 2/28 처럼 말일 보정
  return d;
}

/**
 * 트레이너 1명을 결제한다. 성공하면 구독 기간을 한 달 연장, 실패하면 시도 횟수를 늘린다.
 * 반드시 서비스 키 클라이언트로 호출.
 */
export async function chargeTrainer(admin: SupabaseClient, trainerId: string) {
  const [{ data: sub }, { data: key }, { data: tr }] = await Promise.all([
    admin.from("subscriptions").select("*").eq("trainer_id", trainerId).single(),
    admin.from("billing_keys").select("*").eq("trainer_id", trainerId).single(),
    admin.from("trainers").select("name,email,gym_name").eq("id", trainerId).single(),
  ]);
  if (!sub || !key?.billing_key) return { ok: false as const, reason: "등록된 카드가 없습니다." };

  const plan = planById(sub.plan_id);
  const orderId = newOrderId();
  const now = new Date();
  // 기간이 남아 있으면 그 끝에서, 끝났으면 지금부터 한 달
  const base = sub.current_period_end && new Date(sub.current_period_end) > now ? new Date(sub.current_period_end) : now;
  const periodEnd = addMonth(base);

  const r = await chargeBillingKey(key.billing_key, {
    customerKey: key.customer_key,
    amount: plan.price,
    orderId,
    orderName: `FitTrainer ${plan.name} 월 구독`,
    customerEmail: tr?.email ?? undefined,
    customerName: tr?.name || tr?.gym_name || undefined,
  });

  if (r.ok) {
    await admin.from("payments").insert({
      trainer_id: trainerId, order_id: orderId, plan_id: plan.id, amount: plan.price, status: "paid",
      payment_key: r.data.paymentKey, receipt_url: r.data.receipt?.url ?? null,
      period_start: base.toISOString(), period_end: periodEnd.toISOString(),
    });
    await admin.from("subscriptions").update({
      status: "active", current_period_end: periodEnd.toISOString(), failed_attempts: 0, updated_at: now.toISOString(),
    }).eq("trainer_id", trainerId);
    return { ok: true as const, periodEnd };
  }

  const attempts = (sub.failed_attempts ?? 0) + 1;
  await admin.from("payments").insert({
    trainer_id: trainerId, order_id: orderId, plan_id: plan.id, amount: plan.price, status: "failed",
    failure_reason: `${r.error.code}: ${r.error.message}`,
  });
  await admin.from("subscriptions").update({
    status: attempts >= MAX_ATTEMPTS ? "canceled" : "past_due",
    failed_attempts: attempts,
    // 체험 종료 직후 첫 결제가 실패하면 유예 기간 계산 기준이 필요하다
    current_period_end: sub.current_period_end ?? now.toISOString(),
    updated_at: now.toISOString(),
  }).eq("trainer_id", trainerId);
  return { ok: false as const, reason: r.error.message };
}
