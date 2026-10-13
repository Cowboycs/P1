import Link from "next/link";

const v = (k: string, fallback = "미입력") => process.env[k] || fallback;

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
        상호 {v("NEXT_PUBLIC_BIZ_NAME")} · 대표 {v("NEXT_PUBLIC_BIZ_CEO")} · 사업자등록번호 {v("NEXT_PUBLIC_BIZ_NO")} · 통신판매업 신고 {v("NEXT_PUBLIC_BIZ_MAILORDER_NO")}
      </div>
      <div>
        주소 {v("NEXT_PUBLIC_BIZ_ADDRESS")} · 고객센터 {v("NEXT_PUBLIC_BIZ_PHONE")} · {v("NEXT_PUBLIC_BIZ_EMAIL")}
      </div>
    </footer>
  );
}
