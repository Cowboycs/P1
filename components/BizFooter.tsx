import Link from "next/link";
import { BIZ, show } from "@/lib/biz";

/** 전자상거래법·PG 심사상 필수 사업자 정보 표기 */
export default function BizFooter() {
  return (
    <footer className="biz">
      <nav>
        <Link href="/legal/terms">이용약관</Link>
        <Link href="/legal/privacy"><b>개인정보처리방침</b></Link>
        <Link href="/legal/refund">환불 정책</Link>
      </nav>
      <div>
        상호 {show(BIZ.name)} · 대표 {show(BIZ.ceo)} · 사업자등록번호 {show(BIZ.no)} · 통신판매업 신고 {show(BIZ.mailorder)}
      </div>
      <div>
        주소 {show(BIZ.address)} · 고객센터 {show(BIZ.phone)} · {show(BIZ.email)}
      </div>
    </footer>
  );
}
