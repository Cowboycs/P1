"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const LINKS = [
  ["/app", "수업 기록"],
  ["/app/members", "회원"],
  ["/app/library", "종목·컨디션"],
  ["/app/dashboard", "대시보드"],
  ["/app/billing", "구독·결제"],
] as const;

export default function Nav({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <div className="in">
        <Link href="/app" className="logo">Fit<span>Trainer</span></Link>
        <nav className="nav">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <div className="who">
          <span>{name} 트레이너</span>
          <button className="sbtn" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}
