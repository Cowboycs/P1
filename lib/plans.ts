export type PlanId = "starter" | "pro" | "unlimited";

export const PLANS: { id: PlanId; name: string; price: number; limit: number | null; blurb: string }[] = [
  { id: "starter", name: "스타터", price: 25000, limit: 20, blurb: "개인 PT·소규모 레슨" },
  { id: "pro", name: "프로", price: 35000, limit: 50, blurb: "전업 트레이너 표준" },
  { id: "unlimited", name: "무제한", price: 55000, limit: null, blurb: "회원이 많은 강사·센터" },
];

export const TRIAL_DAYS = 14;

export const planById = (id: string) => PLANS.find((p) => p.id === id) ?? PLANS[1];
export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
