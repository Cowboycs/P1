import { SUPABASE_URL, secretKeyEnv } from "./config";
import "server-only";
import { createClient } from "@supabase/supabase-js";

/** 서비스 키 클라이언트. RLS를 우회하므로 서버 라우트에서만, 소유권 확인 후 사용. */
export function supabaseAdmin() {
  const key = secretKeyEnv();
  if (!key) throw new Error("FT_SUPABASE_SECRET_KEY가 설정되지 않았습니다.");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
