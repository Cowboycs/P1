import Link from "next/link";
import { getContext } from "@/lib/context";
import { isActive } from "@/lib/subscription";

/** 구독이 유효하지 않으면 기능 대신 결제 안내를 보여준다 */
export default async function Gate({ children }: { children: React.ReactNode }) {
  const { sub } = await getContext();
  if (isActive(sub)) return <>{children}</>;
  return (
    <div className="panel stack" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", alignItems: "center" }}>
      <h1 className="display" style={{ fontSize: 28, margin: 0 }}>{sub?.status === "expired" ? "무료 체험이 끝났습니다" : "구독이 필요합니다"}</h1>
      <p className="muted" style={{ margin: 0 }}>등록한 회원과 수업 기록은 그대로 보관되어 있습니다. 요금제를 고르고 카드를 등록하면 바로 이어서 쓸 수 있습니다.</p>
      <Link href="/app/billing" className="btn primary">요금제 선택하기</Link>
    </div>
  );
}
