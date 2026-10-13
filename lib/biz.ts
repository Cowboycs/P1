/**
 * 사업자 정보 (전자상거래법·PG 심사상 화면 하단 필수 표기).
 * 공개 정보라 코드에 직접 둔다. Vercel 환경변수 NEXT_PUBLIC_BIZ_* 가 있으면 그 값이 우선한다.
 * 비어 있는 항목은 화면에 "미입력"으로 보인다.
 */
const DEFAULTS = {
  name: "두교글로벌",
  ceo: "김동완",
  no: "158-62-00442",
  mailorder: "2024-부산사상구-0184",
  address: "부산광역시 남구 홍곡로 360, 102동 603호",
  phone: "010-2672-5252",
  email: "k4d3mo@gmail.com",
};

export const BIZ = {
  name: process.env.NEXT_PUBLIC_BIZ_NAME || DEFAULTS.name,
  ceo: process.env.NEXT_PUBLIC_BIZ_CEO || DEFAULTS.ceo,
  no: process.env.NEXT_PUBLIC_BIZ_NO || DEFAULTS.no,
  mailorder: process.env.NEXT_PUBLIC_BIZ_MAILORDER_NO || DEFAULTS.mailorder,
  address: process.env.NEXT_PUBLIC_BIZ_ADDRESS || DEFAULTS.address,
  phone: process.env.NEXT_PUBLIC_BIZ_PHONE || DEFAULTS.phone,
  email: process.env.NEXT_PUBLIC_BIZ_EMAIL || DEFAULTS.email,
};

export const show = (v: string, fallback = "미입력") => v || fallback;
