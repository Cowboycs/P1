import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export const alimtalkConfigured = () =>
  !!(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_PFID && process.env.SOLAPI_TEMPLATE_REPORT);

function authHeader() {
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", process.env.SOLAPI_API_SECRET!).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${process.env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 승인된 알림톡 템플릿으로 발송. 템플릿 문구는 카카오 심사본과 1글자도 달라지면 안 되므로
 * 여기서는 변수만 채운다. 키가 없으면 실제 발송 없이 'simulated'를 돌려준다.
 */
export async function sendAlimtalk(opts: {
  to: string;
  templateId: string | undefined;
  variables: Record<string, string>;
}): Promise<{ status: "sent" | "simulated" | "failed"; detail?: string }> {
  if (!alimtalkConfigured() || !opts.templateId) return { status: "simulated" };
  const to = opts.to.replace(/\D/g, "");
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            to,
            from: process.env.SOLAPI_SENDER?.replace(/\D/g, ""),
            kakaoOptions: {
              pfId: process.env.SOLAPI_PFID,
              templateId: opts.templateId,
              variables: opts.variables,
              disableSms: false, // 카톡 미사용자는 문자로 대체 발송
            },
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", detail: json.errorMessage ?? `HTTP ${res.status}` };
    const failed = json?.failedMessageList?.length;
    if (failed) return { status: "failed", detail: json.failedMessageList[0]?.statusMessage ?? "발송 실패" };
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", detail: (e as Error).message };
  }
}
