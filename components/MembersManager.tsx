"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "./useToast";

type M = { id: string; name: string; goal: string; profile: string; phone: string; total_sessions: number; left_sessions: number; caution: string; progress: string; consent_at: string };
const GOALS = ["다이어트", "재활 (허리)", "재활 (무릎)", "근력 향상", "체형교정", "필라테스", "체력 관리"];
const digits = (s: string) => s.replace(/\D/g, "");
const fmtPhone = (s: string) => { const d = digits(s); return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : s; };

export default function MembersManager({ initial, limit, planName }: { initial: M[]; limit: number | null; planName: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { toast, node } = useToast();
  const [list, setList] = useState(initial);
  const [armed, setArmed] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", goal: "", profile: "", phone: "", total: "20", caution: "", consent: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const full = limit !== null && list.length >= limit;

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!f.name.trim()) return setErr("이름을 입력해 주세요.");
    if (![10, 11].includes(digits(f.phone).length)) return setErr("카톡 받을 휴대전화 번호를 확인해 주세요 (10~11자리).");
    if (!f.consent) return setErr("회원 본인에게 개인정보·건강정보 수집·이용 동의를 받은 뒤 체크해 주세요.");
    const total = Math.max(1, Math.round(Number(f.total) || 20));
    setBusy(true);
    const uid = (await sb.auth.getUser()).data.user!.id;
    const { data, error } = await sb.from("members").insert({
      trainer_id: uid, name: f.name.trim(), goal: f.goal.trim() || "체력 관리", profile: f.profile.trim(),
      phone: fmtPhone(f.phone), total_sessions: total, left_sessions: total, caution: f.caution.trim(), consent_at: new Date().toISOString(),
    }).select().single();
    setBusy(false);
    if (error) return setErr(error.message.includes("MEMBER_LIMIT") ? `${planName} 요금제는 회원 ${limit}명까지 등록할 수 있습니다. 구독·결제에서 요금제를 올려 주세요.` : "등록하지 못했습니다. 다시 시도해 주세요.");
    setList((l) => [...l, data as M]);
    setF({ name: "", goal: "", profile: "", phone: "", total: "20", caution: "", consent: false });
    toast(`${data.name} 회원을 등록했습니다`);
  }

  async function save(m: M, k: keyof M, raw: string) {
    let v: string | number = raw.trim();
    if (k === "name" && !v) return toast("이름은 비울 수 없습니다");
    if (k === "phone") { if (![10, 11].includes(digits(raw).length)) return toast("번호는 10~11자리로 입력해 주세요"); v = fmtPhone(raw); }
    if (k === "total_sessions") v = Math.max(1, Math.round(Number(raw) || 1));
    if (k === "left_sessions") v = Math.min(m.total_sessions, Math.max(0, Math.round(Number(raw) || 0)));
    if (m[k] === v) return;
    const patch: Partial<M> = { [k]: v } as Partial<M>;
    if (k === "total_sessions" && m.left_sessions > (v as number)) patch.left_sessions = v as number;
    const { error } = await sb.from("members").update(patch).eq("id", m.id);
    if (error) return toast("저장하지 못했습니다");
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, ...patch } : x)));
    toast("저장했습니다");
  }

  async function archive(m: M) {
    if (armed !== m.id) return setArmed(m.id);
    const { error } = await sb.from("members").update({ archived: true }).eq("id", m.id);
    setArmed(null);
    if (error) return toast("삭제하지 못했습니다");
    setList((l) => l.filter((x) => x.id !== m.id));
    toast(`${m.name} 회원을 목록에서 삭제했습니다`);
  }

  const fld = (m: M, k: keyof M, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="ml">{label}
      <input className="fld" defaultValue={String(m[k] ?? "")} onBlur={(e) => save(m, k, e.target.value)} {...extra} />
    </label>
  );

  return (
    <div className="stack">
      <div className="row">
        <h1 className="display" style={{ fontSize: 28, margin: 0 }}>회원 관리</h1>
        <span className="pill good num">{list.length}{limit !== null ? ` / ${limit}명` : "명"}</span>
        <span className="small muted">고친 내용은 칸을 벗어나면 저장됩니다.</span>
      </div>
      <datalist id="goals">{GOALS.map((g) => <option key={g} value={g} />)}</datalist>
      <div className="mcards">
        {list.map((m) => (
          <div className="mcard" key={m.id}>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input className="fld" style={{ fontWeight: 700, fontSize: 15 }} defaultValue={m.name} maxLength={12} aria-label="이름" onBlur={(e) => save(m, "name", e.target.value)} />
              <button className={`sbtn del ${armed === m.id ? "armed" : ""}`} onClick={() => archive(m)} onBlur={() => setArmed(null)}>{armed === m.id ? "삭제 확인" : "삭제"}</button>
            </div>
            {fld(m, "goal", "목적", { list: "goals", maxLength: 20 })}
            {fld(m, "profile", "나이·성별·수업 주기", { maxLength: 30 })}
            {fld(m, "phone", "카톡 수신 번호", { type: "tel", inputMode: "tel", maxLength: 13 })}
            <div className="m2">{fld(m, "total_sessions", "등록 횟수", { type: "number", min: 1 })}{fld(m, "left_sessions", "잔여 횟수", { type: "number", min: 0 })}</div>
            {fld(m, "progress", "진행 상황", { maxLength: 40 })}
            <label className="ml">주의사항 (AI 일지에 반영)
              <textarea className="fld" defaultValue={m.caution} maxLength={120} onBlur={(e) => save(m, "caution", e.target.value)} />
            </label>
            <span className="pill good">개인정보·건강정보 동의 {new Date(m.consent_at).toLocaleDateString("ko-KR")}</span>
          </div>
        ))}

        <form className="mcard new" onSubmit={create}>
          <b>새 회원 등록</b>
          {full ? (
            <p className="small" style={{ margin: 0 }}>{planName} 요금제의 회원 한도({limit}명)에 도달했습니다. <Link href="/app/billing">요금제 올리기</Link></p>
          ) : (
            <>
              <label className="ml">이름 *<input className="fld" id="nm-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={12} /></label>
              <label className="ml">목적<input className="fld" id="nm-goal" list="goals" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} placeholder="다이어트" maxLength={20} /></label>
              <label className="ml">나이·성별·수업 주기<input className="fld" id="nm-profile" value={f.profile} onChange={(e) => setF({ ...f, profile: e.target.value })} placeholder="35세 여성 · 주 2회" maxLength={30} /></label>
              <label className="ml">카톡 수신 번호 *<input className="fld" id="nm-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="010-0000-0000" maxLength={13} /></label>
              <label className="ml">등록 횟수<input className="fld" id="nm-total" type="number" min={1} value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></label>
              <label className="ml">주의사항<textarea className="fld" id="nm-caution" value={f.caution} onChange={(e) => setF({ ...f, caution: e.target.value })} placeholder="부상 이력, 피해야 할 동작" maxLength={120} /></label>
              <label className="chk"><input type="checkbox" id="nm-consent" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />회원에게 개인정보·건강정보 수집·이용 및 알림톡 발송 동의를 받았습니다 (필수)</label>
              {err && <div className="err">{err}</div>}
              <button className="sbtn add" disabled={busy}>{busy ? "등록 중…" : "회원 등록"}</button>
            </>
          )}
        </form>
      </div>
      {node}
    </div>
  );
}
