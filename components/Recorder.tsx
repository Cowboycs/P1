"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import ReportView, { type Item, type Report } from "./ReportView";
import { useToast } from "./useToast";

type Member = { id: string; name: string; goal: string; profile: string; phone: string; left_sessions: number; total_sessions: number; caution: string };
type Exercise = { id: string; category: string; name: string; weight: number; reps: number; sets: number; timed: boolean; sort: number };
type Tag = { id: string; label: string; sort: number };

const leftClass = (n: number) => (n <= 1 ? "crit" : n <= 3 ? "warn" : "good");
const plateColor = (w: number) => (!w ? "var(--line)" : w >= 60 ? "var(--plate-red)" : w >= 30 ? "var(--plate-blue)" : w >= 15 ? "var(--plate-yellow)" : "var(--plate-green)");
const today = () => new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" }).replace(/\s/g, "").replace(/\.$/, "");
const maskPhone = (p: string) => { const d = p.replace(/\D/g, ""); return d.length >= 10 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : "번호 미등록"; };

export default function Recorder(props: { trainerName: string; initialMembers: Member[]; initialExercises: Exercise[]; initialTags: Tag[] }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { toast, node: toastNode } = useToast();
  const [members, setMembers] = useState(props.initialMembers);
  const [exercises, setExercises] = useState(props.initialExercises);
  const [tags, setTags] = useState(props.initialTags);
  const [sel, setSel] = useState(props.initialMembers[0]?.id ?? "");
  const cats = useMemo(() => [...new Set(exercises.map((e) => e.category))], [exercises]);
  const [cat, setCat] = useState(cats[0] ?? "");
  const [picked, setPicked] = useState<Item[]>([]);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [memo, setMemo] = useState("");
  const [quickEx, setQuickEx] = useState("");
  const [quickTag, setQuickTag] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<"gen" | "send" | null>(null);
  const [status, setStatus] = useState<{ kind: "err" | "ok" | "muted"; text: string } | null>(null);
  const [sent, setSent] = useState<{ date: string; left: number; delivery: string } | null>(null);
  const [ptab, setPtab] = useState<"talk" | "rep">("talk");

  const m = members.find((x) => x.id === sel);

  if (!members.length) {
    return (
      <div className="panel stack" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", alignItems: "center" }}>
        <h1 className="display" style={{ fontSize: 26, margin: 0 }}>첫 회원을 등록해 주세요</h1>
        <p className="muted" style={{ margin: 0 }}>회원 이름, 카톡 받을 번호, 운동 목적을 넣으면 바로 수업 기록을 시작할 수 있습니다.</p>
        <Link className="btn primary" href="/app/members">회원 등록하기</Link>
      </div>
    );
  }

  function reset(nextSel?: string) {
    if (nextSel) setSel(nextSel);
    setPicked([]); setOn(new Set()); setMemo(""); setSessionId(null); setReport(null); setStatus(null); setSent(null);
  }
  function toggleEx(e: Exercise) {
    setPicked((p) => p.some((x) => x.name === e.name) ? p.filter((x) => x.name !== e.name)
      : [...p, { name: e.name, weight: Number(e.weight), reps: e.reps, sets: e.sets, timed: e.timed }]);
  }
  function bump(i: number, k: "weight" | "reps" | "sets", d: number) {
    setPicked((p) => p.map((x, j) => j === i ? { ...x, [k]: Math.max(k === "weight" ? 0 : 1, Math.round((x[k] + d) * 10) / 10) } : x));
  }
  function setVal(i: number, k: "weight" | "reps" | "sets", v: string) {
    const n = parseFloat(v);
    setPicked((p) => p.map((x, j) => j === i ? { ...x, [k]: isFinite(n) ? Math.max(k === "weight" ? 0 : 1, n) : x[k] } : x));
  }
  async function addQuickEx(e: React.FormEvent) {
    e.preventDefault();
    const name = quickEx.trim();
    if (!name || !cat) return;
    if (exercises.some((x) => x.name === name)) return toast(`'${name}'은(는) 이미 목록에 있습니다`);
    const { data, error } = await sb.from("exercises").insert({ trainer_id: (await sb.auth.getUser()).data.user!.id, category: cat, name, weight: 0, reps: 10, sets: 3, sort: 999 }).select().single();
    if (error || !data) return toast("종목을 추가하지 못했습니다");
    setExercises((l) => [...l, data as Exercise]);
    setPicked((p) => [...p, { name, weight: 0, reps: 10, sets: 3, timed: false }]);
    setQuickEx(""); toast(`'${name}' 추가하고 오늘 기록에 넣었습니다`);
  }
  async function addQuickTag(e: React.FormEvent) {
    e.preventDefault();
    const label = quickTag.trim();
    if (!label) return;
    if (tags.some((t) => t.label === label)) return toast("이미 있는 항목입니다");
    const { data, error } = await sb.from("condition_tags").insert({ trainer_id: (await sb.auth.getUser()).data.user!.id, label, sort: 999 }).select().single();
    if (error || !data) return toast("항목을 추가하지 못했습니다");
    setTags((l) => [...l, data as Tag]); setOn((s) => new Set(s).add(label)); setQuickTag("");
  }

  async function generate() {
    if (!m) return;
    if (!picked.length) return setStatus({ kind: "err", text: "먼저 오늘 한 운동을 1개 이상 체크해 주세요." });
    setBusy("gen"); setStatus({ kind: "muted", text: "AI가 일지를 쓰는 중입니다…" }); setSent(null);
    const t0 = performance.now();
    const res = await fetch("/api/ai/draft", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: m.id, items: picked, tags: [...on], memo, session_id: sessionId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setStatus({ kind: "err", text: json.error ?? "일지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." });
    setSessionId(json.session_id); setReport(json.report);
    setStatus({ kind: "ok", text: `초안 완성 (${((performance.now() - t0) / 1000).toFixed(1)}초). 고칠 곳을 고친 뒤 승인해 주세요.` });
  }

  async function send() {
    if (!m || !sessionId || !report) return;
    if (!report.summary.trim()) return toast("요약 문장을 채워 주세요");
    setBusy("send");
    const res = await fetch("/api/sessions/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, report: clean(report), items: picked }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setStatus({ kind: "err", text: json.error ?? "발송하지 못했습니다." });
    setMembers((l) => l.map((x) => x.id === m.id ? { ...x, left_sessions: json.left } : x));
    setSent({ date: today(), left: json.left, delivery: json.delivery });
    setPtab("talk");
    const label = json.delivery === "sent" ? "카톡으로 발송했습니다" : json.delivery === "simulated" ? "저장했습니다 (알림톡 미연동: 시뮬레이션)" : `저장했지만 알림톡 발송에 실패했습니다: ${json.detail ?? ""}`;
    setStatus({ kind: json.delivery === "failed" ? "err" : "ok", text: `${m.name}님 일지를 ${label}` });
    toast(`${m.name}님 일지 ${json.delivery === "failed" ? "발송 실패" : "완료"}`);
  }

  const upd = (k: keyof Report, v: string) => setReport((r) => {
    if (!r) return r;
    if (k === "posture") return { ...r, posture: v.split("\n") };
    if (k === "homework") return { ...r, homework: v.split("\n").map((l) => { const [name = "", dose = "", tip = ""] = l.split("|").map((s) => s.trim()); return { name, dose, tip }; }) };
    return { ...r, [k]: v };
  });
  const clean = (r: Report): Report => ({ ...r, posture: r.posture.map((s) => s.trim()).filter(Boolean), homework: r.homework.filter((h) => h.name) });

  const left = sent ? sent.left : m?.left_sessions ?? 0;

  return (
    <div className="grid2">
      <div className="stack">
        <section className="panel">
          <h2 className="step-h"><span className="n">1</span>회원 선택 <Link href="/app/members" className="sbtn end">회원 관리</Link></h2>
          <div className="members">
            {members.map((x) => (
              <button key={x.id} className="mem" aria-pressed={x.id === sel} onClick={() => reset(x.id)}>
                <span className="r"><b>{x.name}</b><span className={`pill ${leftClass(x.left_sessions)}`}>잔여 <span className="num">{x.left_sessions}</span>회</span></span>
                <span className="goal">{x.goal} · {x.profile}</span>
                <span className="goal num">{maskPhone(x.phone)}</span>
              </button>
            ))}
          </div>
          {m?.caution && <div className="caution"><b>주의사항</b> {m.caution}</div>}
        </section>

        <section className="panel">
          <h2 className="step-h"><span className="n">2</span>운동 종목 체크 <Link href="/app/library" className="sbtn end">종목 관리</Link></h2>
          <div className="chips">{cats.map((c) => <button key={c} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}</div>
          <div className="lib">
            {exercises.filter((e) => e.category === cat).map((e) => {
              const isOn = picked.some((p) => p.name === e.name);
              return <button key={e.id} aria-pressed={isOn} onClick={() => toggleEx(e)}>{isOn ? "✓ " : "+ "}{e.name}</button>;
            })}
          </div>
          <form className="quick" onSubmit={addQuickEx}>
            <input className="fld" id="quick-ex" value={quickEx} onChange={(e) => setQuickEx(e.target.value)} placeholder={`목록에 없는 종목을 '${cat}'에 바로 추가`} maxLength={30} />
            <button className="sbtn add">추가</button>
          </form>
          <div className="sets">
            {!picked.length && <div className="empty">아직 추가한 종목이 없습니다. 위 목록에서 오늘 한 운동을 탭하세요.</div>}
            {picked.map((p, i) => (
              <div className="set" key={p.name}>
                <span className="plate" style={{ background: plateColor(p.weight) }} title="원판 색으로 본 중량대" />
                <span className="nm">{p.name}</span>
                {(["weight", "reps", "sets"] as const).map((k) => (
                  <div className="stepper" key={k}>
                    <button type="button" aria-label="줄이기" onClick={() => bump(i, k, k === "weight" ? (p.weight >= 20 ? -5 : -2.5) : k === "reps" && p.timed ? -10 : -1)}>−</button>
                    <input type="number" inputMode="decimal" aria-label={k} value={p[k]} onChange={(e) => setVal(i, k, e.target.value)} />
                    <em>{k === "weight" ? "kg" : k === "reps" ? (p.timed ? "초" : "회") : "세트"}</em>
                    <button type="button" aria-label="늘리기" onClick={() => bump(i, k, k === "weight" ? (p.weight >= 20 ? 5 : 2.5) : k === "reps" && p.timed ? 10 : 1)}>+</button>
                  </div>
                ))}
                <button className="rm" aria-label={`${p.name} 삭제`} onClick={() => setPicked((l) => l.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="step-h"><span className="n">3</span>오늘 컨디션·관찰 <Link href="/app/library#tags" className="sbtn end">컨디션 관리</Link></h2>
          <div className="chips">
            {tags.map((t) => (
              <button key={t.id} aria-pressed={on.has(t.label)} onClick={() => setOn((s) => { const n = new Set(s); n.has(t.label) ? n.delete(t.label) : n.add(t.label); return n; })}>{t.label}</button>
            ))}
          </div>
          <form className="quick" onSubmit={addQuickTag}>
            <input className="fld" id="quick-tag" value={quickTag} onChange={(e) => setQuickTag(e.target.value)} placeholder="새 컨디션 바로 추가 (예: 수면 부족)" maxLength={20} />
            <button className="sbtn add">추가</button>
          </form>
          <textarea className="fld" id="memo" style={{ marginTop: 10 }} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={300} placeholder="한 줄 메모 (예: 스쿼트 마지막 세트에서 무릎이 안쪽으로 모임)" />
        </section>

        <section className="panel">
          <h2 className="step-h"><span className="n">4</span>AI 일지 초안 <small>트레이너 승인 후에만 발송</small></h2>
          <div className="row">
            <button className="btn primary" onClick={generate} disabled={busy !== null}>{busy === "gen" ? "작성 중…" : report ? "다시 생성" : "AI 일지 생성"}</button>
            {status && <span className={status.kind === "muted" ? "small muted" : status.kind}>{status.text}</span>}
          </div>
          {report && (
            <div className="draft">
              <label className="ml">오늘 수업 요약<textarea className="fld" id="d-summary" value={report.summary} onChange={(e) => upd("summary", e.target.value)} /></label>
              <label className="ml">자세 피드백 (줄마다 1개)<textarea className="fld" id="d-posture" value={report.posture.join("\n")} onChange={(e) => upd("posture", e.target.value)} /></label>
              <label className="ml">홈트 숙제 (줄마다 1개, "종목 | 횟수 | 팁")<textarea className="fld" id="d-homework" value={report.homework.map((h) => [h.name, h.dose, h.tip].join(" | ")).join("\n")} onChange={(e) => upd("homework", e.target.value)} /></label>
              <label className="ml">식단 가이드<textarea className="fld" id="d-diet" value={report.diet} onChange={(e) => upd("diet", e.target.value)} /></label>
              <label className="ml">다음 수업 포커스<textarea className="fld" id="d-next" value={report.next} onChange={(e) => upd("next", e.target.value)} /></label>
              <div className="row">
                <button className="btn send" onClick={send} disabled={busy !== null || !!sent}>
                  {busy === "send" ? "발송 중…" : sent ? "발송 완료" : "승인하고 발송하기"}
                </button>
                {sent && <button className="btn ghost" onClick={() => reset()}>다음 수업 기록</button>}
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="phone-col">
        <div className="ptabs" role="tablist">
          <button role="tab" aria-selected={ptab === "talk"} onClick={() => setPtab("talk")}>회원 카톡</button>
          <button role="tab" aria-selected={ptab === "rep"} onClick={() => setPtab("rep")}>일지 페이지</button>
        </div>
        <div className="phone"><div className="screen">
          {!report || !m ? (
            <div className="chat"><p style={{ textAlign: "center", marginTop: "40%", fontSize: 13 }}>종목을 체크하고 AI 일지를 생성하면<br />{m?.name}님이 받을 화면이 여기 표시됩니다.</p></div>
          ) : ptab === "talk" ? (
            <div className="chat">
              <div className="from"><div className="avatar">FT</div><div style={{ flex: 1, minWidth: 0 }}>
                <div className="atk"><div className="hd">알림톡 도착</div>
                  <div className="bd">[수업 일지 안내]{"\n"}<span className="v">{m.name}</span>님, 오늘 수업 기록이 도착했어요.{"\n\n"}■ 수업일: <span className="v">{sent?.date ?? today()}</span>{"\n"}■ 담당: <span className="v">{props.trainerName}</span> 트레이너{"\n"}■ 잔여 횟수: <span className="v">{sent ? left : Math.max(0, left - 1)}회</span>{"\n\n"}아래 버튼에서 자세 피드백과 홈트 숙제를 확인하세요.</div>
                  <div className="bt">수업 일지 보기</div></div>
              </div></div>
              {(sent ? left : left - 1) <= 3 && (
                <div className="from"><div className="avatar">FT</div><div style={{ flex: 1, minWidth: 0 }}>
                  <div className="atk"><div className="hd">알림톡 도착</div>
                    <div className="bd">[잔여 횟수 안내]{"\n"}<span className="v">{m.name}</span>님의 PT 잔여 횟수가 <span className="v">{Math.max(0, sent ? left : left - 1)}회</span> 남았습니다.{"\n"}다음 일정은 <span className="v">{props.trainerName}</span> 트레이너와 상의해 주세요.</div></div>
                </div></div>
              )}
            </div>
          ) : (
            <ReportView date={sent?.date ?? today()} trainer={props.trainerName} member={m.name} goal={m.goal} items={picked} report={clean(report)} />
          )}
        </div></div>
        <p className="hint">노란 칸만 회원마다 바뀝니다. 알림톡은 카카오가 승인한 고정 문구에 변수만 넣어 보낼 수 있어서, AI가 쓴 내용은 버튼 뒤 일지 페이지에 담깁니다.</p>
      </aside>
      {toastNode}
    </div>
  );
}
