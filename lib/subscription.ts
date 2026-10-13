export type Subscription = {
  trainer_id: string;
  plan_id: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trial_ends_at: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  card_summary: string | null;
  failed_attempts: number;
};

const GRACE_MS = 3 * 24 * 3600 * 1000; // 결제 실패 시 3일 유예

/** DB 함수 public.subscription_active 와 같은 규칙 */
export function isActive(s: Subscription | null | undefined, now = Date.now()): boolean {
  if (!s) return false;
  if (s.status === "trialing") return new Date(s.trial_ends_at).getTime() > now;
  if (s.status === "active" || s.status === "past_due") {
    const end = s.current_period_end ? new Date(s.current_period_end).getTime() : now;
    return end > now - GRACE_MS;
  }
  if (s.status === "canceled") return !!s.current_period_end && new Date(s.current_period_end).getTime() > now;
  return false;
}

export function daysLeft(iso: string | null, now = Date.now()) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86400000));
}

export function statusLabel(s: Subscription): string {
  switch (s.status) {
    case "trialing": return `무료 체험 중 (${daysLeft(s.trial_ends_at)}일 남음)`;
    case "active": return s.cancel_at_period_end ? "해지 예약됨" : "구독 중";
    case "past_due": return "결제 실패 (재시도 중)";
    case "canceled": return "해지됨";
    case "expired": return "체험 종료";
  }
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }) : "-";
