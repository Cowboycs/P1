import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chargeTrainer } from "@/lib/billing";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * 매일 09:00 KST(vercel.json) 실행.
 * 1) 체험·결제 기간이 끝났고 해지 예약이 없는 구독 → 결제
 * 2) 해지 예약된 구독의 기간이 끝남 → canceled / expired
 * 3) 카드 없이 체험이 끝남 → expired
 * 4) 결제 실패(past_due) → 하루 한 번 재시도, 3회 실패 시 canceled
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const log = { charged: 0, failed: 0, expired: 0, canceled: 0 };

  // 해지 예약 종료 처리
  const { data: endTrial } = await admin.from("subscriptions").update({ status: "expired", updated_at: now })
    .eq("status", "trialing").eq("cancel_at_period_end", true).lte("trial_ends_at", now).select("trainer_id");
  const { data: endPaid } = await admin.from("subscriptions").update({ status: "canceled", updated_at: now })
    .eq("status", "active").eq("cancel_at_period_end", true).lte("current_period_end", now).select("trainer_id");
  log.expired += endTrial?.length ?? 0;
  log.canceled += endPaid?.length ?? 0;

  // 카드 없이 체험 종료
  const { data: trialDue } = await admin.from("subscriptions").select("trainer_id,card_summary")
    .eq("status", "trialing").eq("cancel_at_period_end", false).lte("trial_ends_at", now);
  const noCard = (trialDue ?? []).filter((s) => !s.card_summary).map((s) => s.trainer_id);
  if (noCard.length) {
    await admin.from("subscriptions").update({ status: "expired", updated_at: now }).in("trainer_id", noCard);
    log.expired += noCard.length;
  }

  // 결제 대상
  const { data: renew } = await admin.from("subscriptions").select("trainer_id")
    .in("status", ["active", "past_due"]).eq("cancel_at_period_end", false).lte("current_period_end", now);
  const due = [...(trialDue ?? []).filter((s) => s.card_summary).map((s) => s.trainer_id), ...(renew ?? []).map((s) => s.trainer_id)];

  for (const id of due) {
    try {
      const r = await chargeTrainer(admin, id);
      r.ok ? log.charged++ : log.failed++;
    } catch (e) {
      log.failed++;
      console.error("charge error", id, e);
    }
  }
  console.log("billing cron", log);
  return NextResponse.json(log);
}
