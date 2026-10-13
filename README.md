# FitTrainer

PT·필라테스 강사가 수업 중 체크한 기록으로 AI가 회원용 일지를 쓰고, 트레이너 승인 후 카카오 알림톡으로 보내는 구독형 SaaS.

## 구성

| 영역 | 사용 기술 | 위치 |
|---|---|---|
| 웹 앱 | Next.js 15 (App Router) | `app/`, `components/` |
| DB·로그인 | Supabase (서울 리전, 프로젝트 `rovkkutkjossxcamzddn`) | `supabase/schema.sql` |
| AI 일지 | Claude API (서버에서만 호출) | `lib/ai.ts`, `app/api/ai/draft` |
| 알림톡 | 솔라피 (키 없으면 시뮬레이션) | `lib/solapi.ts`, `app/api/sessions/send` |
| 정기결제 | 토스페이먼츠 자동결제(빌링) | `lib/toss.ts`, `lib/billing.ts`, `app/billing/success`, `app/api/cron/billing` |
| 호스팅 | Vercel (서울 `icn1`), 매일 09:00 KST 결제 크론 | `vercel.json` |

## 요금제

| 요금제 | 월 요금 | 회원 한도 |
|---|---|---|
| 스타터 | 25,000원 | 20명 |
| 프로 | 35,000원 | 50명 |
| 무제한 | 55,000원 | 무제한 |

- 가입 즉시 14일 무료 체험 (프로 한도 적용, 카드 등록 없이 시작)
- 체험 중 카드를 등록하면 체험 종료일에 첫 결제, 이후 매월 같은 날 자동 결제
- 결제 실패 시 3일 유예 + 매일 재시도, 3회 실패 시 해지
- 해지는 예약 방식: 결제한 기간이 끝날 때까지 이용 가능
- 요금 변경은 다음 결제일부터, 회원 한도는 즉시 적용 (DB 트리거로 강제)

## 운영 전환 체크리스트

### 1. Vercel 환경변수 (Settings → Environment Variables)

| 변수 | 어디서 | 비고 |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | **비밀**. 결제·크론에 필수 |
| `ANTHROPIC_API_KEY` | console.anthropic.com | **비밀** |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | 토스페이먼츠 개발자센터 → API 키 | 먼저 `test_ck_`/`test_sk_`로 테스트 |
| `CRON_SECRET` | 직접 생성 (32자 이상 무작위 문자열) | **비밀** |
| `NEXT_PUBLIC_APP_URL` | 실제 도메인 | 알림톡 버튼 링크에 사용 |
| `NEXT_PUBLIC_BIZ_*` | 사업자등록증 | 상호·대표·사업자번호·통신판매업 신고번호·주소·연락처·이메일 (PG 심사 필수) |
| `SOLAPI_*` | 솔라피 콘솔 | 템플릿 승인 후 입력. 비워 두면 발송은 시뮬레이션 |

변수를 바꾼 뒤에는 Vercel에서 **Redeploy** 해야 반영됩니다.

### 2. Supabase 설정

- Authentication → URL Configuration → **Site URL**을 실제 도메인으로, Redirect URLs에 `https://도메인/auth/callback` 추가
- Authentication → Emails: 기본 메일 발송은 시간당 몇 통으로 제한됨 → 운영 전에 **Custom SMTP**(예: Resend, SES) 연결
- 인증 메일 문구를 한국어로 수정 (Email Templates)

### 3. 토스페이먼츠

1. 테스트 키로 카드 등록 → 결제 내역 → 해지까지 확인
2. **자동결제(빌링) 계약** 신청: 일반 결제와 별도 계약이며, 사이트에 이용약관·환불 정책·사업자 정보가 보여야 심사 통과
3. 계약 완료 후 `live_ck_`/`live_sk_`로 교체 → 즉시 운영 결제

### 4. 카카오 알림톡 (솔라피)

카카오 비즈니스 채널을 솔라피에 연동한 뒤 아래 두 템플릿을 **문구 그대로** 등록·심사 요청합니다. 변수명이 코드와 같아야 합니다.

**① 수업 일지 안내** → 승인 후 템플릿 ID를 `SOLAPI_TEMPLATE_REPORT`에

```
[수업 일지 안내]
#{회원명}님, 오늘 수업 기록이 도착했어요.

■ 수업일: #{수업일}
■ 담당: #{트레이너명} 트레이너
■ 잔여 횟수: #{잔여횟수}회

아래 버튼에서 자세 피드백과 홈트 숙제를 확인하세요.
```
버튼: 웹링크 · 이름 `수업 일지 보기` · 모바일/PC 링크 `https://#{일지링크}`

**② 잔여 횟수 안내** → `SOLAPI_TEMPLATE_REMAIN`

```
[잔여 횟수 안내]
#{회원명}님의 PT 잔여 횟수가 #{잔여횟수}회 남았습니다.
다음 일정은 #{트레이너명} 트레이너와 상의해 주세요.
```

- 두 템플릿 모두 할인·재등록 권유 문구를 넣으면 반려됩니다(정보성만 가능).
- 알림톡 실패 시 문자로 대체 발송되므로 `SOLAPI_SENDER`(발신번호 사전 등록)가 필요합니다.

### 5. 법무

- `app/legal/*` 이용약관·개인정보처리방침·환불 정책은 **초안**입니다. 서비스 개시 전 법률 검토 필수.
- 회원(고객) 건강정보는 민감정보 → 트레이너가 회원 동의를 받았다고 체크해야만 등록되도록 막아 두었습니다. 회원용 동의서 양식을 트레이너에게 제공하는 것을 권장합니다.
- 개인정보처리방침의 국외 이전(Anthropic, Vercel) 항목은 실제 계약 기준으로 확인하세요.

## 보안 설계 요약

- 모든 테이블 RLS: 트레이너는 자기 데이터만 접근
- `billing_keys`는 정책 없음 → 브라우저에서 절대 접근 불가, 서버(서비스 키)만
- 구독 상태 변경은 서버만 가능 (클라이언트는 읽기 전용)
- 회원용 일지는 36자 무작위 토큰 링크 + 발송된 일지만 조회 + 검색엔진 차단
- 카드 등록 시 `customerKey` 소유자 검증, 크론은 `CRON_SECRET` 필요
- 발송은 조건부 업데이트로 중복 발송 방지

## 로컬 실행

```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev
```
