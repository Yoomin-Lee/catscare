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

## 남은 작업 (TODO)

- [ ] Supabase DB 연동 → 고양이 데이터 실제 저장 (현재 로컬 상태만)
- [ ] 병원 기록 실제 CRUD 구현
- [ ] 체중 기록 DB 저장 + 그래프 실 데이터
- [ ] 투약 알림 푸시 알림 연동
- [ ] 다크모드 지원
- [ ] 모바일 앱 빌드 (iOS / Android)
