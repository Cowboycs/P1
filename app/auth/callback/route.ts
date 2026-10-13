import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";
  if (code) {
    const sb = await supabaseServer();
    await sb.auth.exchangeCodeForSession(code);
  }
  // 오픈 리다이렉트 방지: 내부 경로만 허용
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  return NextResponse.redirect(new URL(safe, url.origin));
}
