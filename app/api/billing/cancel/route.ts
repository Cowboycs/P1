import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** 해지 예약/취소. 이미 결제한 기간(또는 체험 기간)은 끝까지 이용 가능 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { cancel } = await req.json().catch(() => ({}));
  const { error } = await supabaseAdmin().from("subscriptions")
    .update({ cancel_at_period_end: !!cancel, updated_at: new Date().toISOString() })
    .eq("trainer_id", auth.user.id).in("status", ["trialing", "active"]);
  if (error) return NextResponse.json({ error: "처리하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
