import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";

/** 요금제 변경: 금액은 다음 결제일부터, 회원 한도는 즉시 적용 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { plan } = await req.json().catch(() => ({}));
  const p = PLANS.find((x) => x.id === plan);
  if (!p) return NextResponse.json({ error: "알 수 없는 요금제입니다." }, { status: 400 });
  if (p.limit !== null) {
    const { count } = await sb.from("members").select("id", { count: "exact", head: true }).eq("archived", false);
    if ((count ?? 0) > p.limit) return NextResponse.json({ error: `회원이 ${count}명이라 ${p.name} 요금제(최대 ${p.limit}명)로 바꿀 수 없습니다.` }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("subscriptions").update({ plan_id: p.id, updated_at: new Date().toISOString() }).eq("trainer_id", auth.user.id);
  if (error) return NextResponse.json({ error: "변경하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
