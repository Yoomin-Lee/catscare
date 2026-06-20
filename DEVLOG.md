# CatsCare 개발일지

## 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | CatsCare — 고양이 건강 관리 앱 |
| 기간 | 2026-06-07 ~ |
| 스택 | Expo 56 · React Native · TypeScript · Supabase |
| 배포 | https://yoomin-lee.github.io/catscare/ |
| 레포지토리 | https://github.com/Yoomin-Lee/catscare |

---

## 2026-06-07 (Day 1) — 프로젝트 초기 설정

### 작업 내용
- `create-expo-app`으로 프로젝트 생성 (Expo 56, Expo Router, TypeScript)
- Supabase 프로젝트 연동 (`@supabase/supabase-js`)
- `src/lib/supabase.ts` — Supabase 클라이언트 초기화
- 이메일 로그인 화면 구현 (`src/components/login-screen.tsx`)
- `_layout.tsx`에 Supabase 세션 감지 + 인증 게이트 적용

### 기술 결정
- **Expo Router** 파일 기반 라우팅 채택 → URL 구조 자동 관리
- **React Compiler** 활성화 (`experiments.reactCompiler: true`) → 렌더링 최적화 자동화
- **AsyncStorage** → 모바일 세션 영속성

---

## 2026-06-08 (Day 2) — 핵심 기능 구현

### 1. 고양이 프로필 관리 (홈 탭)
**파일:** `src/app/home.tsx`, `src/lib/cats-context.tsx`

- 멀티캣 지원: Context API로 전역 상태 관리 (CRUD)
- 고양이 추가/수정/삭제, 사진 업로드 (`expo-image-picker`)
- 품종·이름 기반 아바타 색상 자동 배정 (`catAvatarColor`)
- 폼: 이름, 품종(16종 목록), 나이, 체중, 성별, 중성화 여부

### 2. 주기 알람 탭
**파일:** `src/app/index.tsx`

- **병원 방문 주기**: 마지막 방문일 + 주기(1·3·6·12개월) → 다음 예정일 자동 계산
- **화장실 모래 교체**: 마지막 교체일 + 주기(1·2·4·8주) → 다음 교체일 계산
- **D-day 뱃지**: 3일 이내 주황(`#FAEEDA`), 14일 이내 빨강(`#FAECE7`), 이후 초록(`#E1F5EE`)
- **BottomSheet**: 날짜 선택(DateTimePicker) + 주기 선택 패널

### 3. 투약 관리
**파일:** `src/components/medication-section.tsx`

- 투약 스케줄 등록 (최대 5개)
- 알림 토글 (병원 방문 7일·1일 전 / 모래 교체 3일 전·당일)

### 4. 나머지 탭 구현
| 탭 | 파일 | 주요 내용 |
|---|---|---|
| 병원 기록 | `hospital.tsx` | AI 진료 녹음 요약, 검사 기록, 접종 체크리스트 |
| 체중/투약 | `body.tsx` | 체중 추이 그래프, 투약 기록 |
| 식단/기호성 | `food.tsx` | AI 취향 분석, 사료별 기호성 평가 |

### 5. 웹 전용 탭 바
**파일:** `src/components/app-tabs.web.tsx`

- `expo-router/ui`의 `Tabs`, `TabList`, `TabTrigger` 사용
- 상단 헤더 (CatsCare 로고 + 브랜드명)
- 하단 탭 바 5개 탭, 활성 탭 표시 (상단 바 + 색상)

---

## 2026-06-09 (Day 3) — 배포 및 UI 개선

### 1. GitHub Pages 최초 배포
- `app.json`에 `experiments.baseUrl: "/catscare"` 설정
- `npx expo export --platform web` → `dist/` 폴더 생성
- `gh-pages` 패키지로 `gh-pages` 브랜치에 자동 배포

### 2. Jekyll 렌더링 문제 해결
- **원인**: GitHub Pages가 Jekyll을 통해 파일을 처리하면서 `_expo/` 폴더를 무시
- **해결**: `dist/.nojekyll` 파일 추가 → Jekyll 처리 비활성화

### 3. Supabase 웹 인증 수정
**파일:** `src/lib/supabase.ts`

- **문제**: `detectSessionInUrl: false` → 이메일 인증 후 세션을 URL에서 감지 못함
- **해결**: `Platform.OS === 'web'`일 때 `detectSessionInUrl: true`
- **추가**: 웹에서는 `AsyncStorage` 대신 브라우저 `localStorage` 사용

```ts
auth: {
  storage: Platform.OS === 'web' ? undefined : AsyncStorage,
  detectSessionInUrl: Platform.OS === 'web',
}
```

### 4. 데스크톱 모바일 레이아웃 고정
**파일:** `src/app/_layout.tsx`

- **문제**: 데스크톱에서 앱이 전체 화면 너비로 늘어남
- **해결**: `Platform.OS === 'web'`일 때 `max-width: 430px` View 래퍼 적용
- 바깥 배경: `#d8d8d8` (회색) → 앱 영역과 구분

```tsx
<View style={{ flex: 1, backgroundColor: '#d8d8d8', alignItems: 'center' }}>
  <View style={{ flex: 1, width: '100%', maxWidth: 430 }}>
    {content}
  </View>
</View>
```

### 5. 파비콘 교체
- 초기: ChatGPT 생성 고양이 이미지
- 최종: 나뷔츄야옹 실사 사진으로 교체

### 6. 헤더 고양이 아이콘 시각적 중심 보정
**파일:** `src/components/app-tabs.web.tsx`

- **문제**: FontAwesome5 `cat` 아이콘의 무게중심이 위쪽에 있어 텍스트보다 떠 보임
- **해결**: `translateY: 2px`로 아래 이동, 크기 16 → 24px (+50%)

```tsx
logoIcon: {
  width: 30, height: 30,
  alignItems: 'center', justifyContent: 'center',
  transform: [{ translateY: 2 }],
}
```

---

### 7. 생년월일 입력 기능 추가
**파일:** `src/app/home.tsx`, `src/lib/cats-context.tsx`

- `Cat` 타입에 `birthDate?: string` 추가 (포맷: `YYYY.MM.DD`)
- 생년월일 드롭다운 (연/월/일 각각 선택) + 나이 직접입력 토글 UI 구현
- 생년월일 선택 시 `calcAge()` 함수로 만 나이 자동 계산
- 프로필 카드에 생년월일 표시: `코리안숏헤어 · 3살 (2023.03.15) · 4.2kg`

---

### 8. 소수점 체중 입력 수정
**파일:** `src/app/home.tsx`

- `value={String(form.weightKg)}` 방식에서 `weightText` 독립 state 분리
- "4." 입력 시 소수점이 사라지는 버그 수정
- 소수점 둘째 자리까지 허용, 그 이상 차단 (`/^\d*\.?\d{0,2}$/`)

### 9. 코리안숏헤어 품종 세분화 및 아바타 색상 자동 생성
**파일:** `src/lib/cats-context.tsx`, `src/app/home.tsx`

- 코리안숏헤어 → 고등어·턱시도·치즈·삼색·흰색·검정 6종 분화
- 각 유형별 색상 팔레트 추가 (고등어 #78909C, 턱시도 #455A64, 치즈 #F4900C 등)
- 품종 드롭다운에 색상 미리보기 도트(●) 표시
- 사진 미등록 시 선택된 품종 색상으로 아바타 미리보기 실시간 표시

### 10. 로그인 없이 둘러보기
**파일:** `src/app/_layout.tsx`, `src/components/login-screen.tsx`

- 로그인 화면 하단에 "로그인 없이 둘러보기" 버튼 추가
- `guestMode` state로 인증 우회, 로그인 성공 시 자동 해제

### 11. 웹에서 BottomSheet 430px 제한
**파일:** `src/components/bottom-sheet.tsx`

- 데스크톱에서 프로필 편집 시트가 전체 화면 너비로 펼쳐지는 문제 수정
- `maxWidth: 430, alignSelf: 'center'` 적용 → 모바일 레이아웃 유지

---

## 2026-06-09 (Day 3 continued) — UI 개선 연속

### 12. CatsCare 로고 리디자인
**파일:** `src/components/app-tabs.web.tsx`, `src/components/login-screen.tsx`

- 헤더 로고: 오렌지 둥근 뱃지(borderRadius 10) + 흰 고양이 아이콘 + **Cats**(#E9785A) / **Care**(#1D9E75) 컬러 분리 텍스트 + 🐾
- 로그인 화면: 88px 대형 뱃지 + 동일 컬러 타이틀로 브랜드 일관성 확보

### 13. 병원 방문일 · 모래 교체일 캘린더 드롭다운
**파일:** `src/app/index.tsx`

- `@react-native-community/datetimepicker` 제거 → 순수 RN View로 `CalendarDropdown` 컴포넌트 구현
- 날짜 버튼 탭 시 인라인으로 달력 전개 (position: absolute 없음, 웹/모바일 동작)
- 월 이동 버튼, 요일 색상(일=주황, 토=파랑), 선택일 하이라이트, 미래 날짜 비활성

### 14. 화장실 모래 교체 교체 주기 스테퍼
**파일:** `src/app/index.tsx`

- 기존 4개 버튼 → 1~10주 범위 스테퍼 (－ / 숫자 / ＋) 로 변경
- 1주 미만 · 10주 초과에서 버튼 비활성화

### 15. 화장실 모래 교체 기록 히스토리
**파일:** `src/app/index.tsx`

- `sandHistory: Date[]` 상태로 교체 이력 누적
- 메인 카드 하단 "오늘 교체 완료" 빠른 버튼 → 오늘 날짜 기록
- 달력에서 날짜 선택 시 자동 기록 추가 (중복 날짜 dedup)
- 설정 패널 하단에 교체 기록 리스트 (날짜 + 상대 시간)

### 16. 병원 기록 탭 검사 기록 + 수치 그래프
**파일:** `src/app/hospital.tsx`

- `ExamRecord` 타입 + 7개 혈액 수치 메타데이터(BUN, Cre, ALT, AST, Glucose, P, K) 정의
- 혈액 검사 카드: 최근 검사일 + 정상/이상 수치 칩 표시
- **기록 목록** 패널: 날짜별 전체 기록 + 수치 칩
- **수치 그래프** 패널: 최근 1개월 / 1년 토글 + 수치 탭 선택 → 바 차트 (순수 RN View, 정상=초록·이상=주황)
- **기록 추가** 패널: 날짜 + 수치별 입력 폼 → 저장 시 목록 즉시 반영
- Supabase 연동 준비: `exam_records` 테이블 스키마와 1:1 대응 (`id, cat_id, date, type, metrics jsonb`)

### 17. 화장실 알림 시기 드롭다운 + 시간 설정
**파일:** `src/app/index.tsx`

- 알림 항목을 `{ id, days, time }` 구조로 변경 (최대 5개)
- 각 행: **며칠 전** 드롭다운(당일~2주 전) + **시간** 드롭다운(오전 6:00 ~ 오후 10:30, 30분 단위)
- 선택 항목에 체크 표시, 인라인으로 전개 (position: absolute 없음)
- "알림 추가" 버튼으로 항목 추가, ✕ 버튼으로 삭제
- 알람 설정 카드 sub 텍스트가 선택된 알림 목록을 실시간 반영

### 18. Google 소셜 로그인 UI
**파일:** `src/components/login-screen.tsx`

- 이메일/비밀번호 폼 아래 "또는" 구분선 + **Google로 계속하기** 버튼 추가
- `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })` 호출
- `detectSessionInUrl: true` (기존 설정) 로 리다이렉트 후 자동 세션 인식
- **활성화 사전 조건:** Google Cloud Console에서 OAuth 2.0 클라이언트 생성 → Supabase Dashboard Auth > Providers > Google에 Client ID/Secret 입력 필요

### 19. 병원 방문 알림 시기 드롭다운 + 시간 설정
**파일:** `src/app/index.tsx`

- `hospitalNotify: NotifyEntry[]` 상태 추가 (기본: 7일 전 09:00 · 1일 전 09:00)
- 화장실 알림과 동일한 며칠 전 드롭다운 + 시간 드롭다운 UI 적용
- 알람 설정 카드 sub 텍스트 동적 반영

### 20. 투약 복용 시간 드롭다운
**파일:** `src/components/medication-section.tsx`

- `DateTimePicker` 제거 → `TIME_OPTIONS`(30분 단위, 06:00~22:30) 기반 인라인 드롭다운으로 교체
- `times: Date[]` → `times: string[]` (HH:MM) 구조로 변경
- 각 회차별 시간 버튼 탭 → 선택 목록 인라인 전개, 선택 시 자동 닫힘
- 웹/모바일 모두 동작, 스크롤 가능한 드롭다운 목록 (maxHeight 200)

### 21. 쿠팡 모래 바로가기 링크 연결
**파일:** `src/app/index.tsx`

- 벤토나이트 모래 링크를 네이버 검색에서 쿠팡 직링크로 변경
- `Linking.openURL` 연결 + 외부 링크 아이콘 추가

### 22. 투약 약이름 플레이스홀더 변경
**파일:** `src/components/medication-section.tsx`

- 약이름 입력 필드 placeholder `"약 이름을 입력하세요"` → `"예: 레나메진, 아조딜 등"` 변경
- 실제 사용 예시를 제시해 UX 개선

### 23. 체중 입력 플레이스홀더 변경 및 기본값 버그 수정
**파일:** `src/app/home.tsx`

- 체중 필드 placeholder `"3.00"` → `"0.00kg"` 로 변경 (단위 포함)
- **버그 수정:** `emptyForm()`의 `weightKg: 3.0` 기본값이 `weightText` state에 그대로 반영되어 신규 고양이 추가 시 placeholder가 보이지 않고 "3"이 표시되는 문제 해결
  - `emptyForm()`: `weightKg: 3.0` → `weightKg: 0`
  - `openAdd()`: `setWeightText(String(ef.weightKg))` → `setWeightText('')`
  - 이제 신규 추가 폼에서 placeholder `"0.00kg"` 정상 표시

---

---

## 2026-06-10 (Day 4) — Supabase DB 전체 연동

### DB 테이블 생성 (Supabase SQL Editor)
- `cats`: 고양이 프로필 (id, user_id, name, breed, age_years, birth_date, weight_kg, gender, neutered, photo_url)
- `weight_records`: 체중 기록 (cat_id, weight_kg, recorded_at)
- `medications`: 투약 스케줄 (cat_id, name, dosage, frequency, doses_per_day, times[], alarm_on)
- `exam_records`: 검사 기록 (cat_id, date, type, metrics jsonb)
- 모든 테이블에 RLS 정책 적용 (auth.uid() = user_id)

### cats-context.tsx 리팩토링
- 로컬 useState → Supabase CRUD로 전환
- `userId`, `loading` 컨텍스트에 노출
- 게스트 모드 (userId 없음): 로컬 상태 유지 (DEFAULT_CAT)
- `addCat` / `updateCat` / `removeCat` → async Supabase 연동

### body.tsx — 체중 기록 실 데이터
- `weight_records` 테이블에서 실 데이터 로드
- 주간/월간/연간 차트 (빈 기록 시 안내 문구)
- "체중 기록 추가" 버튼 → Supabase INSERT
- 투약 기록도 `medications` 테이블에서 실 데이터 표시

### medication-section.tsx — Supabase CRUD
- `useCats()` 로 catId / userId 취득
- 투약 등록/수정/삭제 → Supabase INSERT/UPDATE/DELETE
- 알림 토글 → Supabase UPDATE

### hospital.tsx — 검사 기록 Supabase CRUD
- `INIT_BLOOD` 하드코딩 제거
- `exam_records` 테이블에서 실 데이터 로드
- 기록 추가 → Supabase INSERT

---

## 2026-06-10 (Day 4 continued) — 소셜 로그인 & 계정 설정

### 24. Google OAuth 활성화
**파일:** `src/components/login-screen.tsx` / Supabase Management API

- Google Cloud Console에서 OAuth 2.0 클라이언트 생성
  - Authorized JavaScript origins: `https://kbjxjogmnwurxbxnpfsz.supabase.co`, `https://yoomin-lee.github.io`
  - Authorized redirect URIs: `https://kbjxjogmnwurxbxnpfsz.supabase.co/auth/v1/callback`
- Supabase Management API로 Google provider 활성화
  - `external_google_enabled: true`
  - `external_google_client_id`, `external_google_secret` 등록
- Supabase `site_url` → `https://yoomin-lee.github.io` 변경 (기존 localhost:3000)
- `uri_allow_list`에 `https://yoomin-lee.github.io/catscare` 추가

### 25. 카카오 OAuth 활성화
**파일:** `src/components/login-screen.tsx` / Supabase Management API

- Kakao Developers에서 CatsCare 앱 생성
  - 플랫폼 → Web: `https://yoomin-lee.github.io` 등록
  - Kakao 로그인 활성화, 동의항목 이메일 설정
  - Redirect URI: `https://kbjxjogmnwurxbxnpfsz.supabase.co/auth/v1/callback`
  - Client Secret 발급 및 활성화
- Supabase Management API로 Kakao provider 활성화
  - `external_kakao_enabled: true`
  - REST API 키(client_id) + Client Secret 등록
- 로그인 화면에 **카카오 노란 버튼** 추가
- `handleGoogleSignIn` → `handleSocialSignIn(provider)` 로 통합

### 26. 계정 설정 UI (홈 헤더 ⚙️)
**파일:** `src/app/home.tsx`

- 홈 탭 헤더 우상단 ⚙️ 버튼 추가
- 탭 시 계정 설정 바텀시트 오픈:
  - `supabase.auth.getUser()` 로 현재 유저 정보 조회
  - `user.identities[0].provider` 로 연결 방식 판별 (google / email / kakao)
  - 연결 계정 유형 뱃지 (Google=빨강, 이메일=보라, 카카오=노랑) + 이메일 표시
  - **로그아웃** 버튼 (`supabase.auth.signOut()`)
  - 게스트 모드: "로그인하면 데이터가 저장돼요" 안내

---

---

## 2026-06-10 (Day 5) — 혈액검사 고도화 · OCR · 접종 기록

### 27. 카카오 로그인 제거
**파일:** `src/components/login-screen.tsx`

- 개인 Kakao 앱은 이메일 scope 비지원 (비즈앱 전환 필요) → KOE205 오류 구조적 해결 불가
- 카카오 버튼 및 관련 스타일 완전 제거
- `handleSocialSignIn('google' | 'kakao')` → `handleSocialSignIn('google')` 로 단순화

---

### 28. 혈액검사 항목 실제 검사지 기반 업데이트
**파일:** `src/app/hospital.tsx`

GitHub에 업로드된 실제 Vcheck C10 혈액검사 결과지 이미지 4장 분석 후 전면 교체.

**기존 7개 → Vcheck C10 기반 17개로 확장:**

| 그룹 | 항목 | 정상 범위 | 단위 |
|---|---|---|---|
| 기본 수치 | GLU | 74–152 | mg/dL |
| | BUN | 15.0–37.0 | mg/dL |
| | CREA | 0.7–2.1 | mg/dL |
| | Ca | 2.6–6.4 | mg/dL |
| | TP | 5.8–9.1 | g/dL |
| | ALB | 2.2–4.1 | g/dL |
| | GLOB | 2.6–5.1 | g/dL |
| 간 수치 | ALT | 13–109 | U/L |
| | ALP | 9–109 | U/L |
| | GGT | 0–5 | U/L |
| | TBIL | 0.00–1.00 | mg/dL |
| 콜레스테롤/췌장 | CHOL | 50–230 | mg/dL |
| | AMY | 500–1400 | U/L |
| | LIPA | 0–30 | U/L |
| 특수 검사 | NT-proBNP | < 100 | pmol/L |
| | fSAA | < 5 | ug/mL |
| | SDMA | ≤ 14 | ug/dL |

- `BLOOD_GROUPS: MetricGroup[]` 구조로 4개 그룹 분류
- 수치 입력 폼: 그룹 헤더 구분 + OCR 자동 입력값 초록 배경 강조

---

### 29. 혈액검사 OCR 자동 입력 (검사지 사진 → 수치 자동 등록)
**파일:** `src/app/hospital.tsx`, `supabase/functions/ocr-blood-test/index.ts`

**아키텍처:**
```
앱 (ImagePicker) → base64 인코딩
  → Supabase Edge Function (ocr-blood-test)
    → Anthropic Claude Haiku Vision API
      → JSON 파싱 → 수치 자동 입력
```

**Supabase Edge Function (`supabase/functions/ocr-blood-test/index.ts`):**
- 외부 SDK 없이 순수 `fetch`로 Anthropic API 직접 호출
- CORS 헤더 설정 (웹 앱 호출 허용)
- `ANTHROPIC_API_KEY` 환경 변수로 API 키 보안 관리
- 응답에서 JSON 블록 추출 → `<5` → `5`, `<0.10` → `0.10` 변환

**앱 구현:**
- "검사지 촬영으로 자동 입력" 초록 버튼 (기록 추가 패널 최상단)
- 탭 시 선택 모달:
  - **카메라 촬영** (`ImagePicker.launchCameraAsync`)
  - **갤러리에서 선택** (`ImagePicker.launchImageLibraryAsync`)
- `base64: true, quality: 0.7` 옵션으로 이미지 압축
- Supabase Auth JWT를 Authorization 헤더에 자동 첨부
- OCR 분석 중 로딩 인디케이터 표시
- 인식된 수치: 초록 배경(`#E8F5F0`) 으로 강조 표시

**활성화 조건:**
- Supabase Edge Functions → `ocr-blood-test` → Secrets 탭
- `ANTHROPIC_API_KEY` = Anthropic Console에서 발급한 `sk-ant-...` 키 등록 필요

---

### 30. 접종 기록 CRUD 구현
**파일:** `src/app/hospital.tsx`, `supabase/schema.sql`

**DB 스키마 추가:**
```sql
CREATE TABLE vaccinations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id      UUID REFERENCES cats(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  date        DATE NOT NULL,
  next_date   DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: auth.uid() = user_id
```

**UI:**
- "접종 체크" 섹션 우상단 **"+ 추가"** 버튼
- 기록 없을 때 빈 상태 안내 문구 (탭 시 추가 패널 오픈)
- 접종 추가 BottomSheet:
  - **백신 종류** 프리셋 칩 (FVRCP · 광견병 · FeLV · FIP · 클라미디아 · 직접 입력)
  - **접종일** 캘린더 드롭다운 (오늘 이후 비활성)
  - **다음 접종 예정일** 캘린더 드롭다운 (선택)
  - **메모** 멀티라인 입력 (선택)
- 접종 카드:
  - 접종일 + 다음 접종 예정일 표시
  - 다음 접종일이 오늘 이전이면 **"접종 필요"** 주황 배지 자동 표시
  - 🗑 삭제 버튼 (즉시 반영)
- Supabase 연동: 로그인 시 INSERT/DELETE, 게스트 모드 시 로컬 상태

---

---

## 2026-06-11 (Day 6) — 소셜 로그인 완성 · UX 개선 · AI 기반 설계

### 31. 카카오 로그인 재추가 (비즈앱 전환)
**파일:** `src/components/login-screen.tsx`

- 비즈앱 전환 후 이메일 scope 사용 가능 확인
- 카카오 버튼 및 스타일 복원 (`kakaoBtn`, `kakaoIcon`, `kakaoBtnText`)
- `handleSocialSignIn('google' | 'kakao')` 타입 복원
- Kakao Developers → 플랫폼 → Web 사이트 도메인 `https://yoomin-lee.github.io` 등록 (KOE205 해결)
- Supabase Dashboard → Auth > Providers > Kakao → REST API 키 + Client Secret 등록

### 32. Google 로그인 Supabase Dashboard 설정 완료
- Google Cloud Console OAuth 2.0 클라이언트 생성
- Supabase Auth > Providers > Google 활성화 + Client ID/Secret 등록
- Redirect URI: `https://kbjxjogmnwurxbxnpfsz.supabase.co/auth/v1/callback`
- `site_url` + `uri_allow_list`에 `https://yoomin-lee.github.io/catscare` 등록

### 33. 로그인 후 홈 탭 자동 이동
**파일:** `src/app/_layout.tsx`

- **문제:** 로그인 후 기본 라우트(`/` = 주기 알람)가 표시됨
- **원인:** 웹에서 URL 기반 라우팅 → `NativeTabs.initialRouteName` 미동작
- **해결:** `router.replace('/home')` + `useRef`로 중복 실행 방지
  - `supabase.auth.getSession()` 성공 시 최초 1회 실행
  - `onAuthStateChange` 로그인 이벤트 시 실행
  - 로그아웃 시 `didNavigateRef.current = false` 리셋

```tsx
const didNavigateRef = useRef(false)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session && !didNavigateRef.current) {
    didNavigateRef.current = true
    router.replace('/home')
  }
})
```

### 34. 게스트 모드 → 로그인 화면 이동 버튼
**파일:** `src/app/home.tsx`, `src/lib/auth-context.tsx`, `src/app/_layout.tsx`

- **문제:** 게스트 모드 설정 패널에 로그인 진입 경로 없음
- **해결:** `AuthContext` 신규 생성 → `exitGuestMode()` 함수 노출
- `_layout.tsx`에서 `AuthContext.Provider`로 `setGuestMode(false)` 주입
- `home.tsx` 게스트 카드에 "로그인하러 가기" 버튼 추가 → 시트 닫고 로그인 화면 전환

### 35. DEFAULT_CAT 품종 버그 수정
**파일:** `src/lib/cats-context.tsx`

- **문제:** `DEFAULT_CAT.breed = '코리안숏헤어'` → BREEDS 목록 미포함 → 수정 시 자동으로 '기타' 매핑
- **해결:** `'코리안숏헤어'` → `'코리안숏헤어 (고등어)'` (BREEDS 목록 일치)

### 36. GitHub Pages SPA 라우팅 404 수정
**파일:** `package.json`

- **문제:** `/catscare/home` 등 하위 경로 직접 접근 시 GitHub Pages 404 반환
- **해결:** `predeploy` 스크립트로 `dist/404.html` 자동 생성 (index.html 복사)
  - GitHub Pages는 없는 경로 → 404.html 서빙 → SPA가 클라이언트 라우팅으로 처리

```json
"predeploy": "node -e \"require('fs').copyFileSync('dist/index.html', 'dist/404.html')\""
```

### 37. 보안 검토
- `supabaseAnonKey` (`sb_publishable_...`): 클라이언트 노출 의도된 공개 키, RLS로 보호 → **안전**
- `service_role` 키: 코드 어디에도 없음 → **안전**
- `hospital.tsx` OCR 호출: 런타임 생성 JWT 사용, AI API 키는 서버 환경변수에만 존재 → **안전**

### 38. AI Edge Function 사전 설계
**파일:** `supabase/functions/audio-summary/index.ts`, `supabase/functions/food-recommend/index.ts`

API 키 등록 즉시 활성화 가능한 구조로 사전 구현.

| 함수 | 기능 | 필요 키 |
|---|---|---|
| `audio-summary` | 진료 녹음 → Whisper 전사 → Claude 요약 | `OPENAI_API_KEY` + `ANTHROPIC_API_KEY` |
| `food-recommend` | 식사 이력 분석 → 취향 패턴 + 추천 사료 | `ANTHROPIC_API_KEY` |

**활성화 방법 (결제 후):**
1. `supabase functions deploy audio-summary`
2. `supabase functions deploy food-recommend`
3. Supabase Dashboard → Edge Functions → Secrets에 API 키 등록

### 39. 접종 백신 종류 확장
**파일:** `src/app/hospital.tsx`

기존 6종 → 11종으로 확장:

| 추가 항목 | 설명 |
|---|---|
| 종합백신 3종 / 5종 구분 | FVRCP 단독 vs FeLV+FIV 포함 버전 분리 |
| 고양이 면역결핍 (FIV) | 고양이 에이즈 바이러스 백신 |
| 보르데텔라 | 호흡기 감염 예방 |
| 심장사상충 예방 | 정기 투여 기록용 |
| 외부기생충 예방 (벼룩·진드기) | 정기 투여 기록용 |

### 40. 접종 백신 칩 레이아웃 수정 (가로 스크롤 → 줄바꿈)
**파일:** `src/app/hospital.tsx`

- **문제:** 웹에서 마우스로 가로 스크롤 불가 → 우측 칩 선택 불가
- **원인:** `ScrollView horizontal` 는 터치 입력 기반, 마우스 휠 미지원
- **해결:** `ScrollView horizontal` → `View flexWrap: 'wrap'` 교체
  - 칩이 컨테이너 너비에 맞춰 자동 줄바꿈
  - 웹/모바일 모두 모든 칩 선택 가능

### 41. 홈 탭 "다가오는 일정" 동적 연동
**파일:** `src/app/home.tsx`, `src/lib/schedule-context.tsx`, `src/app/_layout.tsx`, `src/app/index.tsx`

- **문제:** 홈 탭 일정 카드(정기 병원 · 모래 교체)가 하드코딩 — 고양이 바꿔도 그대로
- **해결:** `ScheduleContext` 신규 구현으로 주기 알람 데이터를 전역 공유

**`src/lib/schedule-context.tsx`** (신규):
- `CatSchedule` 타입 정의: `hospitalLastDate`, `hospitalCycle(개월)`, `sandLastDate`, `sandCycle(주)`
- `ScheduleProvider`: `Record<catId, CatSchedule>` 딕셔너리 상태 관리
- `getSchedule(catId)`: 없으면 기본값(오늘 기준 1개월 전 + 주기 6개월/4주) 반환
- `updateSchedule(catId, patch)`: 주기 알람 탭에서 값 변경 시 호출

**`src/app/_layout.tsx`** (수정):
- `ScheduleProvider` 추가: `AuthContext.Provider > ScheduleProvider > CatsProvider` 순서로 중첩

**`src/app/index.tsx`** (수정):
- `useState(new Date(...))` 하드코딩 초기값 제거
- `const { getSchedule, updateSchedule } = useSchedule()` 로 교체
- `hospitalLastDate`, `hospitalCycle`, `sandLastDate`, `sandCycle` → context에서 파생
- 세터 함수 → `updateSchedule(catId, patch)` 호출

**`src/app/home.tsx`** (수정):
- `useSchedule()` → `getSchedule(selectedCat.id)` 로 현재 고양이 일정 조회
- 다음 방문일/교체일 계산: `setMonth(+hospitalCycle)` / `setDate(+sandCycle*7)`
- D-day 계산 + 색상 함수 (`ddayColor`: 3일 이내 주황, 14일 이내 빨강, 이후 초록)
- JSX 하드코딩 `D+27`, `2026.05.12`, `D+172`, `2025.12.18` → 동적 값으로 완전 교체

---

## 2026-06-12 (Day 7) — Gemini AI 연동 완성

### 42. Gemini API 서버 사이드 연동 (보안 이슈 해결)
**파일:** `src/lib/gemini.ts`, `supabase/functions/gemini/index.ts`

**문제 발견 및 해결 과정:**
- 최초 시도: `EXPO_PUBLIC_GEMINI_API_KEY`를 `.env`에 저장 → `npm run deploy` 시 GitHub Push Protection이 차단
  - **원인:** `EXPO_PUBLIC_` 접두사는 빌드 시 API 키를 JS 번들에 그대로 포함시킴 → 공개 저장소에 키 노출
- **해결:** Supabase Edge Function으로 Gemini 호출 이전 → 키는 서버(Supabase Secrets)에만 보관

**Supabase Edge Function (`supabase/functions/gemini/index.ts`):**
- 단일 함수로 3가지 액션 처리:
  - `chat`: 일반 텍스트 프롬프트
  - `summarize-recording`: 오디오 base64 → 진료 내용 요약
  - `analyze-food`: 고양이 정보 + 기호성 기록 → 취향 분석 및 추천
- 외부 SDK 없이 순수 `fetch`로 Gemini REST API 직접 호출
  - 엔드포인트: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- CORS 헤더 설정 (웹 앱 호출 허용)
- `GEMINI_API_KEY` 환경 변수 → Supabase Dashboard > Edge Functions > Secrets에 등록

**`src/lib/gemini.ts` 리팩토링:**
- `@google/generative-ai` SDK 직접 호출 → Supabase Edge Function HTTP 호출로 교체
- 로그인 유저: Supabase JWT 토큰을 Authorization 헤더에 첨부
- 게스트 유저: `EXPO_PUBLIC_SUPABASE_ANON_KEY` 폴백 사용 (401 오류 해결)

### 43. 병원·식단 탭 크래시 버그 수정
**파일:** `src/lib/gemini.ts`

- **문제:** `gemini.ts` 모듈 최상단에서 API 키 없으면 즉시 `throw` → import 시점에 탭 전체 크래시
- **해결:** 모듈 레벨 `throw` 제거 → 각 함수 호출 시점에 키 검증으로 변경
- 이전 구조: `const model = new GoogleGenerativeAI(apiKey)` (모듈 로드 시 실행)
- 이후 구조: `function getModel() { ... }` (호출 시 실행) → 최종적으로 Edge Function 방식으로 대체

### 44. Gemini Edge Function 배포 및 검증
- `npx supabase functions deploy gemini --project-ref kbjxjogmnwurxbxnpfsz --use-api` 배포 완료
- Playwright 자동화 테스트로 실제 동작 검증:
  - 식단 탭 → "맞춤 추천 더 보기" 클릭 → Gemini 200 응답 수신 확인
  - AI 취향 분석 결과 바텀시트 정상 표시 확인

---

---

## 2026-06-15 (Day 8) — 전체 탭 DB 연동 완성

### 45. 로그인 후 데이터 사라짐 버그 수정
**파일:** `src/lib/cats-context.tsx`

- **원인 1:** `addCat` / `updateCat` / `removeCat` 함수 내 `userId` stale closure
  → `userIdRef` 패턴으로 해결 (render마다 `.current = userId` 갱신)
- **원인 2:** `cats` 테이블에 `authenticated` 롤 GRANT 누락
  → Supabase SQL Editor에서 아래 실행하여 해결
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.cats TO authenticated;
  ```
- RLS 정책도 누락 → `auth.uid() = user_id` 조건으로 추가

---

### 46. 투약 기록 CRUD 구현
**파일:** `src/app/body.tsx`

- `Medication` 타입: `{ id, name, dosage, frequency, dosesPerDay }`
- `medications` 테이블에서 실 데이터 FETCH (catId 기준)
- 투약 추가/수정/삭제 BottomSheet:
  - 약 이름, 용량, 복용 주기 (매일·격일·주1회·필요시), 일 복용 횟수 (1·2·3회)
- **최대 7개 제한**: 7개 미만 → "추가 (n/7)" 버튼, 7개 도달 → "최대 7개" 텍스트
- 게스트 모드: 로컬 상태만 유지

---

### 47. 체중 기록 테이블 활성화
**파일:** Supabase SQL Editor

- `weight_records` 테이블이 이미 존재했으나 GRANT 미설정 상태
  ```sql
  ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "weight user" ON public.weight_records ...;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_records TO authenticated;
  ```
- `body.tsx` 체중 그래프가 실 데이터로 정상 표시됨 확인

---

### 48. 홈 탭 건강 통계 실 데이터 연동
**파일:** `src/app/home.tsx`

- `homeWeights` 상태 추가: `{ current: number; prev: number | null }`
  → `weight_records` 최근 2건 FETCH → 현재 체중 + 이전 체중 비교
- 체중 변화 표시: `▲ +0.3kg` / `▼ -0.2kg` / `—`
- 기존 하드코딩 `4.2kg ▲ +0.3kg` → 실 데이터로 완전 교체

---

### 49. 식단/기호성 탭 DB 연동
**파일:** `src/app/food.tsx`

- `food_records` 테이블 생성 및 GRANT 설정
  ```sql
  CREATE TABLE public.food_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat_id      UUID REFERENCES cats(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    preference  TEXT NOT NULL,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- 기존 `FOODS` 하드코딩 배열 → `FoodRecord[]` DB 연동으로 전환
- 식사 기록 추가 → `food_records` INSERT
- React Compiler stale closure 해결: 단일 `form` 객체 → 별도 state 변수 분리
  ```ts
  const [foodName, setFoodName] = useState('')
  const [foodType, setFoodType] = useState('습식')
  const [foodPref, setFoodPref] = useState('잘 먹음')
  const foodNameRef = useRef(foodName)
  // ...
  foodNameRef.current = foodName  // render마다 갱신
  ```
- AI 취향 분석: 하드코딩 샘플 데이터 → 실제 `foods` 상태 데이터로 교체

---

### 50. 홈 탭 최근 식사 연동
**파일:** `src/app/home.tsx`

- `latestFood` 상태 추가: `{ name: string; type: string; preference: string } | null`
  → `food_records` 최근 1건 FETCH (catId, DESC)
- 기존 하드코딩 "고메 참치 파우치 · 습식 · 잘 먹음" → 실 데이터로 교체
- 기록 없을 경우 "식사 기록 없음" 안내

---

### 51. 홈 탭 투약 현황 연동
**파일:** `src/app/home.tsx`

- `homeMeds` 상태 추가: `Medication[]` (최대 3건)
  → `medications` 테이블 FETCH, limit 3
- 기존 하드코딩 리스트 → 실 데이터로 교체
- 기록 없을 경우 빈 상태 처리

---

### 52. 홈 탭 접종 현황 CRUD 구현
**파일:** `src/app/home.tsx`

- `Vaccination` 타입: `{ id, name, done, nextInfo }`
- `vaccinations` 테이블 생성 및 GRANT 설정
- 전체 CRUD: `openAddVacc`, `openEditVacc`, `saveVacc`, `deleteVacc`
- BottomSheet: 백신명 TextInput, 접종완료 Switch, 다음 접종 정보 TextInput
- 섹션 헤더 우측 "추가" 버튼, 항목 탭 시 수정 패널 오픈
- 기존 하드코딩 3종 리스트 → 실 DB 데이터로 완전 교체
- 게스트 모드: 로컬 상태만 유지

---

### 현재 상태 요약

| 탭 | 파일 | DB 연동 |
|---|---|---|
| 홈 | `home.tsx` | ✅ 완전 연동 (체중·투약·식사·접종) |
| 주기 알람 | `index.tsx` | ⚠️ schedule-context 인메모리 (페이지 새로고침 시 초기화) |
| 병원 기록 | `hospital.tsx` | ✅ 완전 연동 (혈액검사·접종 기록) |
| 체중/투약 | `body.tsx` | ✅ 완전 연동 |
| 식단/기호성 | `food.tsx` | ✅ 완전 연동 |

---

## 2026-06-15 (Day 9) — 푸시 알림 + PWA 홈화면 아이콘

### 53. PWA 홈화면 아이콘 개선
**파일:** `public/apple-touch-icon.png`, `src/app/_layout.tsx`

- `sharp`로 `favicon-cat.png` → 180×180 리사이즈 → `public/apple-touch-icon.png` 생성
- `_layout.tsx` Head에 메타 태그 추가:
  ```html
  <link rel="apple-touch-icon" href="/catscare/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="CatsCare" />
  ```
- iOS Safari에서 "홈 화면에 추가" 시 고양이 사진 아이콘 표시

---

### 54. 웹 푸시 알림 (Web Push API)
**파일:** `public/sw.js`, `src/lib/push.ts`, `src/app/_layout.tsx`, `src/app/index.tsx`

**아키텍처:**
```
앱 (알림 권한 요청) → 브라우저 Push 구독 → push_subscriptions DB 저장
pg_cron (30분 주기) → alarm-check Edge Function → push-notify Edge Function → 기기 알림
```

**VAPID 키 생성:**
```bash
npx web-push generate-vapid-keys
# Public:  BF3WQEClvA9QrL...
# Private: 51NR81nw_207E4...
```

**`public/sw.js`** (Service Worker):
- `push` 이벤트 수신 → `showNotification()` 호출
- `notificationclick` 이벤트 → `/catscare/` 오픈

**`src/lib/push.ts`**:
- `registerServiceWorker()` — `/catscare/sw.js` 등록
- `subscribePush(userId)` — 권한 요청 + PushManager.subscribe() + DB UPSERT
- `unsubscribePush(userId)` — 구독 해제 + DB DELETE
- `isPushSubscribed()` — 현재 구독 상태 조회

**`schedule-context.tsx` 업데이트:**
- `CatSchedule` 타입에 `alarmsEnabled`, `hospitalNotify`, `sandNotify` 추가
- DB UPSERT에 3개 컬럼 포함 (`alarms_enabled JSONB`, `hospital_notify JSONB`, `sand_notify JSONB`)

**`index.tsx` 업데이트:**
- 알람 설정 로컬 state 제거 → schedule-context에서 파생
- `toggle()`, `setHospitalNotify()`, `setSandNotify()` → `updateSchedule()` 호출
- 알람 설정 카드에 **기기 알림 수신** 토글 추가

**`supabase/functions/push-notify/index.ts`** (Edge Function):
- `{ userId, title, body }` 입력
- `push_subscriptions` 테이블에서 구독 조회
- `npm:web-push`로 VAPID 서명 후 Web Push 발송
- 410 응답(만료된 구독) → 자동 삭제

**`supabase/functions/alarm-check/index.ts`** (Edge Function):
- pg_cron에 의해 30분마다 호출
- `schedules` 테이블 전체 조회
- 각 유저의 다음 병원 방문일 / 모래 교체일 계산
- 알림 시기 매칭 시 push-notify 호출

**DB 추가 항목:**
```sql
-- schedules 테이블 컬럼 추가
ALTER TABLE public.schedules
  ADD COLUMN alarms_enabled JSONB DEFAULT '{"hospital":true,"sand":true}',
  ADD COLUMN hospital_notify JSONB DEFAULT '[...]',
  ADD COLUMN sand_notify JSONB DEFAULT '[...]';

-- push_subscriptions 테이블
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- pg_cron 스케줄
select cron.schedule('alarm-check-every-30min', '*/30 * * * *', ...);
```

**배포 잔여 작업:**
- push-notify / alarm-check Edge Function 배포 (`supabase functions deploy`)
- push-notify Secrets에 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` 등록

---

## 2026-06-16 (Day 10) — Edge Function 배포 + iOS PWA 탭바 safe area 수정

### 작업 내용

#### 1. Supabase Edge Function 배포 완료
Day 9까지 로컬에만 있던 Edge Function 2개를 Supabase 서버에 배포했다.

**배포 과정:**
- `supabase login`이 비-TTY 환경에서 불가 → `SUPABASE_ACCESS_TOKEN` 환경변수 방식으로 우회
- PowerShell 터미널에서 직접 실행:
  ```powershell
  $env:SUPABASE_ACCESS_TOKEN="<token>"
  npx supabase functions deploy push-notify --project-ref kbjxjogmnwurxbxnpfsz --use-api
  npx supabase functions deploy alarm-check --project-ref kbjxjogmnwurxbxnpfsz --use-api
  ```
- Supabase 대시보드 → Edge Functions → push-notify → Secrets에 VAPID 키 등록:
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`

#### 2. iOS PWA 탭바 safe area 수정

**문제:** iPhone 16 홈 화면에 추가된 PWA에서 하단 탭바 아이콘/라벨이 홈 인디케이터에 가려짐

**원인 분석:**
- 탭바 `paddingBottom: 8` 고정값 — 홈 인디케이터(약 34px) 미반영
- `viewport-fit=cover` 미설정으로 `env(safe-area-inset-bottom)` 값이 0으로 노출됨

**적용한 수정:**
- `_layout.tsx` Head에 `viewport-fit=cover` 메타 뷰포트 추가
- `app-tabs.web.tsx` 탭바에 `useSafeAreaInsets().bottom` 동적 적용
  ```tsx
  const insets = useSafeAreaInsets()
  <View style={[styles.tabBar, { paddingBottom: Math.max(8, insets.bottom) }]}>
  ```

**시행착오:**
- `paddingBottom: 'env(safe-area-inset-bottom, 8px)' as any` → RN Web 런타임 크래시
- `data-tab-bar` CSS 인젝션 방식 → 패딩 과도하게 적용되어 더 잘림
- 최종: `useSafeAreaInsets()` + `viewport-fit=cover` 조합 (PWA 재설치 필요)

### 기술 메모

- **Supabase anon key 노출 문제 아님**: OAuth 리다이렉트 흐름에서 Supabase URL이 주소창에 잠깐 보이는 것은 정상 동작. anon key는 RLS로 보호되므로 공개되어도 무방.
- **iOS Safari에서는 푸시 알림 불가**: iOS 16.4 이상 + 홈 화면 추가(standalone PWA) 상태에서만 Web Push 지원. 일반 Safari 탭 불가.
- **PWA 캐시 주의**: safe area 수정 적용 후 반드시 홈 화면에서 앱 삭제 → 재추가 필요.

---

## 2026-06-16 (Day 11) — 모바일 홈화면 화이트스크린 버그 수정

### 버그 증상
게스트 모드 또는 로그인 후 앱 화면(AppTabs)으로 진입 시 완전 흰 화면(white screen) 발생 — 탭바 포함 전체 UI 렌더링 불가.

### 원인 분석 (2단계)

#### 원인 1: `AnimatedSplashOverlay` — `scheduleOnRN` 웹 미지원
**파일:** `src/components/animated-icon.tsx`

- `react-native-worklets`의 `scheduleOnRN`은 웹에서 동작하지 않음
- Reanimated의 `Keyframe` 애니메이션이 웹에서 `CSSStyleDeclaration` indexed setter를 시도 → `Failed to set an indexed property [0]` 크래시
- 수정: `Platform.OS === 'web'` 조건으로 웹에서는 `null` 반환, Native 전용 `NativeSplashOverlay`로 분리

```tsx
export function AnimatedSplashOverlay() {
  if (Platform.OS === 'web') return null;
  return <NativeSplashOverlay />;
}
```

#### 원인 2 (핵심): `TabList asChild` 자식 View 배열 스타일 — Radix Slot `mergeProps` 버그
**파일:** `src/components/app-tabs.web.tsx`

```
expo-router/ui의 TabList (asChild=true)
  → ViewSlot (= Radix UI Slot 래퍼)
    → mergeProps(slotStyle, childStyle)
      → style: { ...slotPropValue, ...childPropValue }
```

`childPropValue`가 배열(`[styles.tabBar, { paddingBottom: ... }]`)일 때:
```js
{ ...{ flexDir: 'row' }, ...[stylesTabBar, { paddingBottom: 8 }] }
// = { flexDir: 'row', 0: stylesTabBar, 1: { paddingBottom: 8 } }  ← 숫자 키!
```

React DOM이 `element.style[0] = stylesTabBar` 시도 → 크래시

expo-router 소스에도 이 문제에 대한 dev 경고가 있음 (`Slot.js`의 `ShimSlotForReactNative`).

**수정:** 자식 View의 스타일을 `StyleSheet.flatten()`으로 먼저 평탄화

```tsx
// Before (broken):
<View style={[styles.tabBar, { paddingBottom: Math.max(8, insets.bottom) }]}>

// After (fixed):
<View style={StyleSheet.flatten([styles.tabBar, { paddingBottom: Math.max(8, insets.bottom) }])}>
```

### 검증
Playwright 모바일 뷰포트(390×844) 자동화 테스트:
1. 로그인 화면 로드 ✅
2. 게스트 모드 진입 → AppTabs 정상 렌더링 ✅
3. 홈 탭 클릭 → 홈 화면(고양이 프로필, D-day 카드) 정상 표시 ✅
4. Console/PageError 0건 ✅

---

## 남은 작업 (TODO)

- [x] Supabase DB 연동 → 고양이 데이터 / 검사 기록 실제 저장
- [x] 체중 기록 DB 저장 + 그래프 실 데이터
- [x] 투약 데이터 DB 저장
- [x] Google 로그인 활성화
- [x] 카카오 소셜 로그인 연동 (비즈앱 전환 후 활성화)
- [x] 계정 설정 UI (연결 계정 확인 + 로그아웃)
- [x] 혈액검사 항목 실제 검사지 기반 업데이트 (Vcheck C10)
- [x] 혈액검사 OCR 자동 입력 (Supabase Edge Function + Anthropic Vision)
- [x] 접종 기록 CRUD (추가 / 삭제 / Supabase 연동)
- [x] 로그인 후 홈 탭 자동 이동
- [x] 게스트 모드 → 로그인 화면 이동 버튼
- [x] AI Edge Function 사전 설계 (녹음 요약 · 식단 추천)
- [x] 접종 백신 칩 가로 스크롤 → 줄바꿈 (웹 마우스 지원)
- [x] 홈 탭 "다가오는 일정" 고양이별 동적 연동 (ScheduleContext)
- [x] Gemini AI 연동 (식단 추천 · 진료 녹음 요약) — Edge Function 서버사이드 처리
- [x] 투약 기록 CRUD (body.tsx, 최대 7개)
- [x] 식단/기호성 탭 food_records DB 연동
- [x] 홈 탭 전체 실 데이터 연동 (체중·투약·식사·접종)
- [x] 로그인 후 데이터 사라짐 버그 수정 (stale closure + GRANT 누락)
- [x] schedule-context DB 연동 (주기 알람 탭 영속화)
- [x] 알림 설정 DB 연동 (alarmsEnabled, hospitalNotify, sandNotify)
- [x] PWA 홈화면 아이콘 개선 (apple-touch-icon 180x180)
- [x] 웹 푸시 알림 구현 (Service Worker + Web Push API)
- [x] push_subscriptions 테이블 생성
- [x] push-notify Edge Function 구현 (VAPID 서명 Web Push 발송)
- [x] alarm-check Edge Function 구현 (스케줄 기반 알람 체크)
- [x] pg_cron 스케줄 등록 (30분 주기 alarm-check)
- [x] push-notify / alarm-check Edge Function 배포
- [x] VAPID Secrets 등록 (push-notify Edge Function)
- [x] 모바일 홈화면 white screen 버그 수정 (AnimatedSplashOverlay 웹 비활성화 + TabList 배열 스타일 flatten)
- [ ] iOS PWA 탭바 safe area 완전 해결 (useSafeAreaInsets 정상 동작 확인 필요)
- [x] push_subscriptions 테이블 생성 및 GRANT 설정 (누락 확인 후 추가)
- [x] Chrome Web Push 구독 성공 (벨 아이콘 → 허용 → DB 저장 확인)
- [x] push-notify Edge Function sent:0 버그 수정 (service_role GRANT + REST API 직접 호출)
- [x] alarm-check 타임존 버그 수정 (UTC→KST, 30분 버킷)
- [x] VAPID 키 재생성 및 secrets CLI 재등록
- [ ] 웹 푸시 알림 실 수신 테스트 (BadJwtToken 403 → VAPID 키 재설정 후 재테스트 필요)
- [ ] OCR 활성화 (Anthropic API 키 등록 후 즉시 사용 가능)
- [ ] 소변 검사 기록 UI 구현
- [ ] 다크모드 지원

---

## 2026-06-17 (Day 12) — 푸시 알림 배포 완료 및 디버깅

### 55. Supabase Access Token 정리
- 개발 중 생성한 PAT(catscare, rest04, gemini, elifetour-admin) 모두 삭제
- PAT는 CLI 전용 — 앱 동작과 무관, 미사용 토큰 삭제로 보안 정리

### 56. push_subscriptions 테이블 생성
- 배포 후 테스트 중 구독 저장 실패 확인 → 테이블 자체가 schema.sql에 누락된 것을 발견
- Supabase SQL Editor에서 생성 및 권한 설정:
  ```sql
  CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "push_subscriptions: own rows only"
    ON public.push_subscriptions FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
  ```
- schema.sql에도 동일 내용 추가 필요 (TODO)

### 57. Chrome Web Push 구독 성공
- Chrome 알림 권한 팝업이 조용한 알림 요청(quiet prompt)으로 주소창에 벨 아이콘으로 표시됨
- 벨 아이콘 클릭 → 허용 → 토글 활성화 → DB에 구독 정보 저장 확인

### 58. push-notify sent:0 버그 디버깅 (미완)
- 증상: push_subscriptions에 데이터 있음 + 함수 정상 실행(booted/shutdown) + 응답 200 → 그러나 `{ sent: 0 }`
- 원인 추정: SUPABASE_SERVICE_ROLE_KEY가 undefined → RLS 통과 못해 쿼리 결과 0건
- 대응: console.log 디버깅 코드 추가 후 재배포, 다음 세션에서 로그 확인 예정
  ```ts
  console.log('subs:', JSON.stringify(subs), 'error:', JSON.stringify(subsError), 'hasServiceKey:', !!SERVICE_KEY)
  ```

---

## 2026-06-18 (Day 13) — 푸시 알림 디버깅 심층

### 59. alarm-check 타임존 버그 수정
- **버그**: Edge Function은 UTC로 실행되는데 사용자가 설정한 알림 시각(예: 오전 9시)은 KST(UTC+9) 기준
- `n.time === nowHHMM` 비교가 9시간 차이로 절대 일치하지 않음
- **추가 버그**: pg_cron 실행 시각에 몇 초 지연이 생기면 분이 달라져 일치 실패
- **수정** (`supabase/functions/alarm-check/index.ts`):
  ```ts
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const kstH = kstNow.getHours()
  const kstM = kstNow.getMinutes() < 30 ? 0 : 30  // 30분 버킷으로 내림
  const nowHHMM = `${String(kstH).padStart(2, '0')}:${String(kstM).padStart(2, '0')}`
  ```

### 60. push_subscriptions GRANT 누락 수정
- `push-notify` Edge Function이 service_role 키로 `push_subscriptions` 쿼리 시 `permission denied` 에러
- Supabase SQL Editor에서 권한 추가:
  ```sql
  GRANT ALL ON public.push_subscriptions TO service_role;
  ```

### 61. push-notify REST API 직접 호출 방식으로 변경
- Supabase JS 클라이언트(`createClient`)가 service_role 키를 제대로 적용하지 못하는 문제
- Supabase REST API를 fetch로 직접 호출하도록 변경:
  ```ts
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=endpoint,p256dh,auth`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  )
  ```
- 쿼리 성공 확인 (`subs: [{...}] status: 200 hasServiceKey: true`)

### 62. VAPID 키 재생성 및 CLI 배포
- 기존 VAPID private key 분실 → `npx web-push generate-vapid-keys`로 재생성
- `.env` 공개키 업데이트
- Supabase Access Token 발급 → CMD에서 CLI 배포 성공:
  ```
  set SUPABASE_ACCESS_TOKEN=토큰
  npx supabase functions deploy push-notify --project-ref kbjxjogmnwurxbxnpfsz --no-verify-jwt
  npx supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." --project-ref kbjxjogmnwurxbxnpfsz
  ```

### 63. sendNotification 403 BadJwtToken (미해결)
- 증상: 구독 조회 성공 → `webpush.sendNotification` 호출 → FCM에서 `403 BadJwtToken` 반환
- VAPID 키 쌍 재설정 및 앱 재빌드/재배포 후 재구독 완료
- 재테스트 예정

---

## 2026-06-20 (Day 14) — 푸시 알림 최종 완성

### 64. alarm-check daysUntil UTC/KST 버그 수정
**파일:** `supabase/functions/alarm-check/index.ts`

- **버그:** `daysUntil(nextHospital, now)` 호출 시 UTC `now`를 사용 → KST 06:00~08:59 구간(UTC 전날 21:00~23:59)에서 `daysLeft`가 실제보다 1 크게 계산됨
- **원인:** 시각 비교(`nowHHMM`)는 KST 기준으로 올바르게 변환했지만, 날짜 계산에는 UTC `now`를 그대로 전달
- **수정:** `daysUntil` 두 곳 모두 `now` → `kstNow`로 교체
  ```ts
  // Before
  const daysLeft = daysUntil(nextHospital, now)
  // After
  const daysLeft = daysUntil(nextHospital, kstNow)
  ```

### 65. VAPID 키 불일치 원인 규명 및 해결
- **근본 원인:** VAPID 키가 3가지 서로 다른 값으로 혼재
  1. `.env`의 `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (앱 번들에 포함되는 값)
  2. Supabase Secrets의 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (push-notify가 서명에 사용)
  3. Expo 빌드 캐시에 구워진 이전 키 (`BF3WQEClvA9QrL2iiWV...`)
- **추가 혼선:** 사용자가 `Usersym216catscare.env`(잘못된 파일)를 수정하고 `.env`(실제 사용 파일)는 그대로였음
- **해결 순서:**
  1. `npx web-push generate-vapid-keys`로 새 키 쌍 생성
  2. `.env`의 `EXPO_PUBLIC_VAPID_PUBLIC_KEY` 교체
  3. Supabase Secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` 동일 키 쌍으로 교체
  4. `npx expo export --platform web --clear` (캐시 무효화 빌드)
  5. 빌드 파일에서 새 키 존재 확인 후 배포
  6. `DELETE FROM push_subscriptions;` → 앱 재구독

### 66. push_subscriptions 테이블 생성 (누락)
- `sent: 0` 원인 중 하나 → 테이블 자체 미존재 확인 (`PGRST205` 에러)
- Supabase SQL Editor에서 최종 생성:
  ```sql
  CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(endpoint)
  );
  ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "push_subscriptions: own rows only"
    ON public.push_subscriptions FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
  GRANT SELECT, DELETE ON public.push_subscriptions TO service_role;
  ```

### 67. 푸시 알림 end-to-end 최종 검증 ✅
- Supabase Edge Functions → push-notify 테스트에서 `{ "sent": 1 }` 확인
- iOS Safari PWA(홈화면 추가)에서 구독 성공 (push_subscriptions 행 생성 확인)
- pg_cron 잡 (`*/30 * * * *`) 활성 상태 확인

### 완성된 푸시 알림 아키텍처

```
[앱] 알림 수신 토글 ON
  → Notification.requestPermission() → PushManager.subscribe(VAPID 공개키)
  → push_subscriptions 테이블 UPSERT

[pg_cron] */30 * * * *
  → alarm-check Edge Function 호출
    → schedules 테이블 전체 조회
    → KST 기준 날짜/시각 계산 (kstNow 사용)
    → 조건 일치 시 push-notify 호출

[push-notify Edge Function]
  → push_subscriptions 조회 (service_role 키)
  → web-push 라이브러리로 VAPID 서명
  → FCM 엔드포인트에 Web Push 발송
  → 410 응답 시 만료된 구독 자동 삭제

[Service Worker (sw.js)]
  → push 이벤트 수신 → showNotification()
  → notificationclick → /catscare/ 오픈
```
