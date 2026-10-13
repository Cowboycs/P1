/**
 * FitTrainer 전용 Supabase 프로젝트(fittrainer, 서울).
 *
 * Vercel의 Supabase 연동이 별도의 빈 프로젝트를 만들고 NEXT_PUBLIC_SUPABASE_* 변수를 자동으로 채우기 때문에,
 * 그 변수와 이름이 겹치지 않도록 FitTrainer 전용 이름(FT_*)을 쓴다.
 * URL과 publishable 키는 브라우저에 공개되도록 설계된 값이라 코드에 둔다.
 * 서버 비밀 키만 Vercel 환경변수 FT_SUPABASE_SECRET_KEY 로 받는다.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_FT_SUPABASE_URL || "https://rovkkutkjossxcamzddn.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_FT_SUPABASE_KEY || "sb_publishable_3l9gBUiC4vFQ2JGwrH5erg_M0jC5rBJ";

export const secretKeyEnv = () => process.env.FT_SUPABASE_SECRET_KEY;
