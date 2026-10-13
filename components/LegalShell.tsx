import Link from "next/link";
import BizFooter from "./BizFooter";

export default function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="topbar"><div className="in"><Link href="/" className="logo">Fit<span>Trainer</span></Link></div></header>
      <main className="wrap legal">
        <h1 className="display" style={{ fontSize: 30 }}>{title}</h1>
        <p className="banner warn">초안입니다. 서비스 개시 전 법률 검토를 받아 확정해 주세요. 시행일: {process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE || "확정 시 기재"}</p>
        {children}
        <BizFooter />
      </main>
    </>
  );
}
