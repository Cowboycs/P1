"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(sp.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (mode === "signup" && !agree) return setMsg({ kind: "err", text: "이용약관과 개인정보처리방침에 동의해 주세요." });
    setBusy(true);
    const sb = supabaseBrowser();
    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({
        email, password: pw,
        options: { data: { name }, emailRedirectTo: `${location.origin}/auth/callback?next=/app` },
      });
      setBusy(false);
      if (error) return setMsg({ kind: "err", text: error.message.includes("registered") ? "이미 가입된 이메일입니다. 로그인해 주세요." : error.message });
      if (data.session) return router.replace("/app");
      return setMsg({ kind: "ok", text: `${email}로 인증 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다.` });
    }
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: "이메일 또는 비밀번호가 맞지 않습니다." });
    router.replace(sp.get("next") || "/app");
    router.refresh();
  }

  return (
    <main className="wrap">
      <div className="auth panel stack">
        <Link href="/" className="logo">Fit<span>Trainer</span></Link>
        <h1 style={{ margin: 0, fontSize: 20 }}>{mode === "signup" ? "트레이너 가입 (14일 무료)" : "로그인"}</h1>
        <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
          {mode === "signup" && (
            <label className="ml">이름 (회원 카톡에 표시)<input className="fld" id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} /></label>
          )}
          <label className="ml">이메일<input className="fld" id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="ml">비밀번호 {mode === "signup" && "(8자 이상)"}<input className="fld" id="pw" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
          {mode === "signup" && (
            <label className="chk"><input type="checkbox" id="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span><Link href="/legal/terms" target="_blank">이용약관</Link>과 <Link href="/legal/privacy" target="_blank">개인정보처리방침</Link>에 동의합니다 (필수)</span></label>
          )}
          {msg && <div className={msg.kind}>{msg.text}</div>}
          <button className="btn primary" disabled={busy}>{busy ? "처리 중…" : mode === "signup" ? "가입하기" : "로그인"}</button>
        </form>
        <button className="sbtn" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); }}>
          {mode === "signup" ? "이미 계정이 있어요. 로그인" : "처음이에요. 무료로 가입"}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
