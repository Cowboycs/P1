import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 로그인한 트레이너 권한으로 동작하는 서버 클라이언트 (RLS 적용) */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* 서버 컴포넌트에서는 쿠키 쓰기가 막혀 있음. 미들웨어가 갱신한다. */
          }
        },
      },
    }
  );
}

export async function requireUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user };
}
