import Link from "next/link";
import BizFooter from "@/components/BizFooter";
import { PLANS, TRIAL_DAYS, won } from "@/lib/plans";

export default function Landing() {
  return (
    <>
      <header className="topbar">
        <div className="in">
          <Link href="/" className="logo">Fit<span>Trainer</span></Link>
          <div className="who"><Link href="/login">로그인</Link><Link href="/login?mode=signup" className="btn primary" style={{ padding: "7px 14px" }}>무료로 시작</Link></div>
        </div>
      </header>
      <main className="wrap">
        <section className="hero">
          <div>
            <h1>수업 끝나고 카톡 쓰는 1시간,<br /><em>체크 몇 번</em>으로 끝내세요</h1>
            <p>
              수업 중 종목·무게·세트만 체크하면 AI가 회원 목적에 맞춘 자세 피드백과 홈트 숙제를 써 줍니다.
              트레이너가 확인하고 승인하면 회원 카톡으로 일지가 도착합니다. 회원은 앱을 설치할 필요가 없습니다.
            </p>
            <div className="row">
              <Link href="/login?mode=signup" className="btn primary">{TRIAL_DAYS}일 무료 체험 시작</Link>
              <span className="small muted">체험 중에는 결제되지 않습니다</span>
            </div>
          </div>
          <div className="panel">
            <div className="atk" style={{ border: "1px solid var(--line)" }}>
              <div className="hd">알림톡 도착</div>
              <div className="bd">{`[수업 일지 안내]
김서연님, 오늘 수업 기록이 도착했어요.

■ 수업일: 10.13
■ 담당: 강도윤 트레이너
■ 잔여 횟수: 12회

아래 버튼에서 자세 피드백과 홈트 숙제를 확인하세요.`}</div>
              <div className="bt">수업 일지 보기</div>
            </div>
          </div>
        </section>

        <section className="steps3" style={{ marginBottom: 40 }}>
          {[
            ["수업 중 체크", "회원을 고르고 종목·무게·세트·컨디션을 탭으로 기록합니다. 종목과 컨디션 목록은 직접 고칠 수 있습니다."],
            ["AI 일지 초안", "회원의 목적과 주의사항을 반영해 요약, 자세 피드백, 홈트 숙제, 식단 가이드를 씁니다. 의학적 조언은 쓰지 않습니다."],
            ["승인 후 발송", "트레이너가 고치고 승인해야만 나갑니다. 잔여 횟수 차감과 재등록 시점 알림이 자동으로 따라옵니다."],
          ].map(([h, p]) => (
            <div className="panel" key={h}><h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{h}</h3><p className="small muted" style={{ margin: 0 }}>{p}</p></div>
          ))}
        </section>

        <h2 className="display" style={{ fontSize: 30, margin: "0 0 14px" }}>요금제</h2>
        <section className="pricing">
          {PLANS.map((p) => (
            <div className="plan" key={p.id} data-pick={p.id === "pro"}>
              <b>{p.name}</b>
              <div className="price">{won(p.price)}<small> / 월 (VAT 포함)</small></div>
              <ul>
                <li>회원 {p.limit ? `${p.limit}명까지` : "무제한"}</li>
                <li>AI 일지·알림톡 발송 무제한</li>
                <li>출석·재등록 대시보드</li>
              </ul>
              <span className="small muted">{p.blurb}</span>
            </div>
          ))}
        </section>
        <p className="hint">모든 요금제는 {TRIAL_DAYS}일 무료 체험 후 등록한 카드로 매월 자동 결제됩니다. 언제든 해지할 수 있으며 남은 기간까지 이용할 수 있습니다.</p>
        <BizFooter />
      </main>
    </>
  );
}
