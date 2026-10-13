import Gate from "@/components/Gate";
import { getContext } from "@/lib/context";

export const metadata = { title: "대시보드" };
const WEEKS = 12;
const MIN_PER_LOG = 15; // 가정: 수기 일지 1건 작성 15분

function weekStart(d: Date) { // 월요일 시작, KST 기준
  const k = new Date(d.getTime() + 9 * 3600e3);
  const day = (k.getUTCDay() + 6) % 7;
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - day);
}

export default async function Dashboard() {
  const { sb } = await getContext();
  const now = new Date();
  const thisWeek = weekStart(now);
  const from = new Date(thisWeek - (WEEKS - 1) * 7 * 864e5).toISOString().slice(0, 10);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: members }, { data: sessions }, { count: sentMonth }] = await Promise.all([
    sb.from("members").select("id,name,goal,left_sessions,total_sessions,created_at").eq("archived", false).order("created_at"),
    sb.from("sessions").select("member_id,held_on").eq("status", "sent").gte("held_on", from),
    sb.from("sessions").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", monthStart),
  ]);
  const ms = members ?? [];
  const grid = new Map<string, number[]>();
  ms.forEach((m) => grid.set(m.id, Array(WEEKS).fill(0)));
  (sessions ?? []).forEach((s) => {
    const w = Math.round((weekStart(new Date(s.held_on + "T12:00:00+09:00")) - thisWeek) / (7 * 864e5)) + WEEKS - 1;
    const row = grid.get(s.member_id);
    if (row && w >= 0 && w < WEEKS) row[w]++;
  });
  const rows = ms.map((m) => {
    const joined = weekStart(new Date(m.created_at));
    const att = grid.get(m.id)!.map((c, i) => (thisWeek - (WEEKS - 1 - i) * 7 * 864e5 < joined ? null : Math.min(2, c)));
    const valid = att.filter((a): a is number => a !== null);
    const rate = valid.length ? valid.reduce((a, b) => a + b, 0) / (valid.length * 2) : null;
    return { m, att, rate };
  });
  const rated = rows.filter((r) => r.rate !== null);
  const avg = rated.length ? Math.round((rated.reduce((a, r) => a + (r.rate as number), 0) / rated.length) * 100) : 0;
  const soon = ms.filter((m) => m.left_sessions <= 3);
  const cls = (n: number) => (n <= 1 ? "crit" : n <= 3 ? "warn" : "good");
  const wkLabel = (i: number) => (i === WEEKS - 1 ? "이번주" : `${WEEKS - 1 - i}주전`);

  return (
    <Gate>
      <div className="stack">
        <h1 className="display" style={{ fontSize: 28, margin: 0 }}>대시보드</h1>
        <div className="kpis">
          <div className="kpi"><div className="l">이번 달 발송 일지</div><div className="v num">{sentMonth ?? 0}</div><div className="s">건</div></div>
          <div className="kpi"><div className="l">평균 출석률</div><div className="v num">{avg}%</div><div className="s">최근 {WEEKS}주 · 주 2회 기준</div></div>
          <div className="kpi"><div className="l">재등록 임박</div><div className="v num" style={{ color: soon.length ? "var(--warn)" : undefined }}>{soon.length}</div><div className="s">잔여 3회 이하 회원</div></div>
          <div className="kpi"><div className="l">아낀 작성 시간</div><div className="v num">{(((sentMonth ?? 0) * MIN_PER_LOG) / 60).toFixed(1)}h</div><div className="s">가정: 수기 1건 {MIN_PER_LOG}분</div></div>
        </div>
        <div className="dash-grid">
          <section className="panel">
            <h2 className="step-h">출석 현황 <small>발송한 수업 일지 기준</small></h2>
            {rows.length ? (
              <div className="scroll-x">
                <table className="heat">
                  <thead><tr><th />{Array.from({ length: WEEKS }, (_, i) => <th key={i}>{i % 3 === 2 || i === WEEKS - 1 ? wkLabel(i) : ""}</th>)}<th /></tr></thead>
                  <tbody>
                    {rows.map(({ m, att, rate }) => (
                      <tr key={m.id}>
                        <th className="n">{m.name}</th>
                        {att.map((a, i) => <td key={i}><div className={`cell ${a === null ? "cx" : "c" + a}`} title={`${wkLabel(i)}: ${a === null ? "등록 전" : a + "회"}`} /></td>)}
                        <td className="num small" style={{ paddingLeft: 8, color: rate !== null && rate < 0.7 ? "var(--crit)" : "var(--muted)" }}>{rate === null ? "신규" : Math.round(rate * 100) + "%"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty">아직 회원이 없습니다.</div>}
            <div className="row small muted" style={{ marginTop: 8 }}><span>■ 진한 칸 2회 · 옅은 칸 1회 · 회색 결석 · 점선 등록 전</span></div>
          </section>
          <section className="panel">
            <h2 className="step-h">재등록 알림 <small>잔여 횟수 순</small></h2>
            <div className="renew">
              {[...ms].sort((a, b) => a.left_sessions - b.left_sessions).map((m) => (
                <div className={`it ${cls(m.left_sessions)}`} key={m.id}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span><b>{m.name}</b> <span className="small muted">· {m.goal}</span></span>
                    <span className={`pill ${cls(m.left_sessions)}`}>잔여 <span className="num">{m.left_sessions}</span>/{m.total_sessions}</span>
                  </div>
                  <div className="bar"><i style={{ width: `${Math.round(((m.total_sessions - m.left_sessions) / m.total_sessions) * 100)}%` }} /></div>
                </div>
              ))}
              {!ms.length && <div className="empty">회원을 등록하면 표시됩니다.</div>}
            </div>
            <p className="hint">잔여 3회 이하가 되면 수업 일지 발송 때 할인 문구 없는 '잔여 횟수 안내' 알림톡이 함께 나갑니다.</p>
          </section>
        </div>
      </div>
    </Gate>
  );
}
