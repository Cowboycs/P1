import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildPrompt, draftReport } from "@/lib/ai";
import { isActive, type Subscription } from "@/lib/subscription";

export const maxDuration = 60;

type Body = { member_id: string; items: { name: string; weight: number; reps: number; sets: number; timed: boolean }[]; tags: string[]; memo: string; session_id?: string | null };

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: sub } = await sb.from("subscriptions").select("*").eq("trainer_id", auth.user.id).single();
  if (!isActive(sub as Subscription)) return NextResponse.json({ error: "구독이 필요합니다. 구독·결제 메뉴에서 요금제를 선택해 주세요." }, { status: 402 });

  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b?.member_id || !Array.isArray(b.items) || !b.items.length || b.items.length > 30)
    return NextResponse.json({ error: "회원과 운동 기록을 확인해 주세요." }, { status: 400 });

  // RLS 덕분에 본인 회원만 조회됨
  const { data: member } = await sb.from("members").select("id,name,goal,profile,progress,caution").eq("id", b.member_id).single();
  if (!member) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  const { data: trainer } = await sb.from("trainers").select("name").eq("id", auth.user.id).single();

  const items = b.items.map((i) => ({
    name: String(i.name).slice(0, 40), weight: Math.max(0, Number(i.weight) || 0),
    reps: Math.max(1, Math.round(Number(i.reps) || 1)), sets: Math.max(1, Math.round(Number(i.sets) || 1)), timed: !!i.timed,
  }));
  const tags = (b.tags ?? []).map(String).slice(0, 20);
  const memo = String(b.memo ?? "").slice(0, 300);

  let report;
  try {
    report = await draftReport(buildPrompt({ trainer: trainer?.name ?? "", member, items, tags, memo }));
  } catch (e) {
    console.error("draft failed", e);
    return NextResponse.json({ error: "AI 일지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  const row = { trainer_id: auth.user.id, member_id: member.id, items, tags, memo, report, status: "draft" as const };
  let sessionId = b.session_id ?? null;
  if (sessionId) {
    const { data } = await sb.from("sessions").update(row).eq("id", sessionId).eq("status", "draft").select("id").single();
    sessionId = data?.id ?? null;
  }
  if (!sessionId) {
    const { data, error } = await sb.from("sessions").insert(row).select("id").single();
    if (error || !data) return NextResponse.json({ error: "기록을 저장하지 못했습니다." }, { status: 500 });
    sessionId = data.id;
  }
  return NextResponse.json({ session_id: sessionId, report });
}
