export type Item = { name: string; weight: number; reps: number; sets: number; timed: boolean };
export type Report = {
  summary: string;
  posture: string[];
  homework: { name: string; dose: string; tip: string }[];
  diet: string;
  next: string;
};

export const fmtItem = (p: Item) =>
  `${p.weight ? `${p.weight}kg × ` : ""}${p.reps}${p.timed ? "초" : "회"} × ${p.sets}세트`;

/** 회원이 버튼을 눌러 여는 일지 화면. 미리보기와 실제 공개 페이지가 같은 컴포넌트를 쓴다. */
export default function ReportView(p: {
  date: string; trainer: string; gym?: string; member: string; goal: string; items: Item[]; report: Report; asPage?: boolean;
}) {
  const reh = p.goal.includes("재활");
  const H = p.asPage ? "h1" : "h3";
  return (
    <div className="rep">
      <div>
        <div className="eyebrow">{p.date} 수업 일지 · {p.trainer} 트레이너{p.gym ? ` · ${p.gym}` : ""}</div>
        <H>{p.member}님, 오늘도 수고하셨어요</H>
      </div>
      {p.report.summary && <div>{p.report.summary}</div>}
      {p.items.length > 0 && (
        <div><h4>오늘 한 운동</h4>
          <table><tbody>{p.items.map((it, i) => <tr key={i}><td>{it.name}</td><td className="r">{fmtItem(it)}</td></tr>)}</tbody></table>
        </div>
      )}
      {p.report.posture.length > 0 && <div><h4>자세 피드백</h4><ul>{p.report.posture.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {p.report.homework.length > 0 && (
        <div><h4>홈트 숙제</h4>
          <div className="hw">{p.report.homework.map((h, i) => <div key={i}><b>{h.name}{h.dose ? ` · ${h.dose}` : ""}</b>{h.tip}</div>)}</div>
        </div>
      )}
      {p.report.diet && <div><h4>식단 가이드</h4><div>{p.report.diet}</div></div>}
      {p.report.next && <div><h4>다음 수업</h4><div>{p.report.next}</div></div>}
      <div className="disclaim">
        이 일지는 트레이너가 확인한 운동 기록과 일반적인 생활 습관 안내이며, 의학적 진단이나 처방이 아닙니다.
        {reh && " 통증이 생기거나 심해지면 운동을 멈추고 담당 의료진과 상의하세요."}
      </div>
    </div>
  );
}
