import "server-only";

const BASE = "https://api.tosspayments.com";

function auth() {
  const sk = process.env.TOSS_SECRET_KEY;
  if (!sk) throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  return "Basic " + Buffer.from(sk + ":").toString("base64");
}

export const tossMode = () => (process.env.TOSS_SECRET_KEY?.startsWith("live_") ? "live" : "test");

type TossError = { code: string; message: string };

async function call<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: TossError }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60_000); // 토스 권장: 60초 이상
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: { code: json.code ?? String(res.status), message: json.message ?? "결제 서버 오류" } };
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: { code: "NETWORK", message: (e as Error).message } };
  } finally {
    clearTimeout(timer);
  }
}

export type BillingIssue = { billingKey: string; customerKey: string; card?: { number?: string; cardType?: string; issuerCode?: string } };

/** 카드 등록 창에서 받은 authKey로 빌링키 발급 */
export function issueBillingKey(authKey: string, customerKey: string) {
  return call<BillingIssue>("/v1/billing/authorizations/issue", { authKey, customerKey });
}

export type TossPayment = { paymentKey: string; orderId: string; status: string; receipt?: { url?: string }; totalAmount: number };

/** 빌링키로 정기결제 승인 */
export function chargeBillingKey(billingKey: string, p: {
  customerKey: string; amount: number; orderId: string; orderName: string; customerEmail?: string; customerName?: string;
}) {
  return call<TossPayment>(`/v1/billing/${encodeURIComponent(billingKey)}`, p);
}

export function newOrderId() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ft-${d}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
