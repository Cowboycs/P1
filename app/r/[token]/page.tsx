import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportView, { type Item, type Report } from "@/components/ReportView";

export const dynamic = "force-dynamic";
export const metadata = { title: "수업 일지", robots: { index: false, follow: false } };

export default async function MemberReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24,64}$/.test(token)) notFound();
  // 익명 키 + 보안 함수(get_report)로 발송된 일지만 조회
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.rpc("get_report", { p_token: token });
  if (!data) notFound();
  const d = data as { held_on: string; items: Item[]; report: Report; member_name: string; goal: string; trainer_name: string; gym_name: string };
  const dt = new Date(d.held_on + "T00:00:00+09:00");
  const date = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  return (
    <main style={{ background: "var(--surface)", minHeight: "100vh", paddingInline: 4 }}>
      <ReportView asPage date={date} trainer={d.trainer_name || "담당"} gym={d.gym_name} member={d.member_name} goal={d.goal} items={d.items ?? []} report={d.report} />
      <p className="hint" style={{ textAlign: "center", paddingBottom: 24 }}>FitTrainer로 작성된 일지입니다</p>
    </main>
  );
}
