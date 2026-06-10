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

## 남은 작업 (TODO)

- [x] Supabase DB 연동 → 고양이 데이터 / 검사 기록 실제 저장
- [x] 체중 기록 DB 저장 + 그래프 실 데이터
- [x] 투약 데이터 DB 저장
- [x] Google 로그인 활성화
- [x] 카카오 소셜 로그인 연동
- [x] 계정 설정 UI (연결 계정 확인 + 로그아웃)
- [ ] 카카오 KOE205 오류 해결 (앱 상태 / Client Secret 활성화 확인 필요)
- [ ] 소변 검사 기록 UI 구현
- [ ] 푸시 알림 실제 발송 연동 (Expo Notifications)
- [ ] 다크모드 지원
- [ ] 모바일 앱 빌드 (iOS / Android)
