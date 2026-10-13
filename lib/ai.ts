import "server-only";
import Anthropic from "@anthropic-ai/sdk";

import { fmtItem, type Item, type Report } from "@/components/ReportView";
export type { Item, Report };

export function buildPrompt(a: {
  trainer: string; member: { name: string; goal: string; profile: string; progress: string; caution: string };
  items: Item[]; tags: string[]; memo: string;
}) {
  return `너는 한국의 퍼스널 트레이너 "${a.trainer || "담당"}"의 보조 작가다. 오늘 수업 기록을 보고, 트레이너가 회원에게 보낼 수업 일지 초안을 쓴다.

[회원] ${a.member.name} / 목적: ${a.member.goal} / ${a.member.profile} / 진행 상황: ${a.member.progress}
[주의사항] ${a.member.caution || "없음"}
[오늘 수행 운동]
${a.items.map((p) => `- ${p.name}: ${fmtItem(p)}`).join("\n")}
[트레이너 관찰 태그] ${a.tags.join(", ") || "없음"}
[트레이너 메모] ${a.memo || "없음"}

작성 규칙:
- 트레이너가 직접 쓴 것처럼 따뜻하고 간결한 존댓말. 이모지는 쓰지 않는다.
- 자세 피드백은 오늘 한 종목에 대한 구체적 큐(cue)로 2~3개.
- 홈트 숙제는 집에서 기구 없이 할 수 있는 2~3개, 목적과 주의사항에 맞게.
- 식단 가이드는 목적에 맞는 일반적 습관 수준 1~2문장. 칼로리 숫자 처방, 보충제 권유 금지.
- 진단, 치료, 효과 보장 표현 금지. 재활 목적이면 "통증이 생기면 즉시 멈추고 담당 의료진과 상의" 취지를 홈트 팁에 넣는다.
- 광고, 할인, 재등록 권유 문장 금지.

출력: JSON 하나만, 다른 글 없이. 형식:
{"summary":"오늘 수업 요약 1~2문장","posture":["피드백1","피드백2"],"homework":[{"name":"종목","dose":"횟수·세트","tip":"한 줄 팁"}],"diet":"1~2문장","next":"다음 수업 포커스 1문장"}`;
}

function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  throw new Error("AI 응답을 해석하지 못했습니다.");
}

export function normalizeReport(j: any): Report {
  const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []);
  return {
    summary: String(j?.summary ?? ""),
    posture: arr(j?.posture).map(String).slice(0, 3),
    homework: arr(j?.homework).slice(0, 3).map((h: any) =>
      typeof h === "string" ? { name: h, dose: "", tip: "" } : { name: String(h?.name ?? ""), dose: String(h?.dose ?? ""), tip: String(h?.tip ?? "") }),
    diet: String(j?.diet ?? ""),
    next: String(j?.next ?? ""),
  };
}

export async function draftReport(prompt: string): Promise<Report> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return normalizeReport(parseJson(text));
}
