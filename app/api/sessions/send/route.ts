import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeReport } from "@/lib/ai";
import { sendAlimtalk } from "@/lib/solapi";
import { isActive, type Subscription } from "@/lib/subscription";

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: sub } = await sb.from("subscriptions").select("*").eq("trainer_id", auth.user.id).single();
  if (!isActive(sub as Subscription)) return NextResponse.json({ error: "구독이 필요합니다." }, { status: 402 });

  const b = await req.json().catch(() => null);
  if (!b?.session_id || !b?.report) return NextResponse.json({ error: "발송할 일지가 없습니다." }, { status: 400 });
  const report = normalizeReport(b.report);
  if (!report.summary.trim()) return NextResponse.json({ error: "요약 문장을 채워 주세요." }, { status: 400 });

  const { data: s } = await sb.from("sessions").select("id,status,member_id,report_token,held_on").eq("id", b.session_id).single();
  if (!s) return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  if (s.status === "sent") return NextResponse.json({ error: "이미 발송한 일지입니다." }, { status: 409 });

  const { data: m } = await sb.from("members").select("id,name,phone,left_sessions").eq("id", s.member_id).single();
  const { data: t } = await sb.from("trainers").select("name").eq("id", auth.user.id).single();
  if (!m) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });

  const left = Math.max(0, m.left_sessions - 1);
  // 트레이너가 승인한 최종 문장과 운동 기록을 저장 → 상태 변경 (조건부 업데이트로 중복 발송 방지)
  const items = Array.isArray(b.items) ? b.items.slice(0, 30) : undefined;
  const { data: locked } = await sb.from("sessions")
    .update({ report, ...(items ? { items } : {}), status: "sent", sent_at: new Date().toISOString() })
    .eq("id", s.id).eq("status", "draft").select("id").single();
  if (!locked) return NextResponse.json({ error: "이미 발송 처리된 일지입니다." }, { status: 409 });
  await sb.from("members").update({ left_sessions: left }).eq("id", m.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const date = new Date(s.held_on + "T00:00:00+09:00");
  const dateLabel = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  // 템플릿 변수명은 카카오 심사본과 정확히 같아야 함 (README 참고)
  const r1 = await sendAlimtalk({
    to: m.phone,
    templateId: process.env.SOLAPI_TEMPLATE_REPORT,
    variables: {
      "#{회원명}": m.name, "#{수업일}": dateLabel, "#{트레이너명}": t?.name || "담당",
      "#{잔여횟수}": String(left), "#{일지링크}": `${appUrl.replace(/^https?:\/\//, "")}/r/${s.report_token}`,
    },
  });
  if (left <= 3 && process.env.SOLAPI_TEMPLATE_REMAIN) {
    await sendAlimtalk({
      to: m.phone, templateId: process.env.SOLAPI_TEMPLATE_REMAIN,
      variables: { "#{회원명}": m.name, "#{잔여횟수}": String(left), "#{트레이너명}": t?.name || "담당" },
    });
  }
  const delivery = r1.status === "failed" ? `failed: ${r1.detail ?? ""}`.slice(0, 200) : r1.status;
  await sb.from("sessions").update({ delivery }).eq("id", s.id);

  return NextResponse.json({ ok: true, left, delivery: r1.status, detail: r1.detail, report_url: `${appUrl}/r/${s.report_token}` });
}
