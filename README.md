# CatsCare

고양이 건강 관리 앱 — 병원 일정, 투약, 체중, 식단을 한 곳에서.

## 스크린 구성

| 탭 | 화면 | 기능 |
|---|---|---|
| 주기 알람 | `src/app/index.tsx` | 병원 방문·모래 교체 D-day, 투약 알림 토글 |
| 병원 기록 | `src/app/hospital.tsx` | 병원 방문 이력 |
| 홈 | `src/app/home.tsx` | 고양이 프로필 CRUD, 사진 업로드 |
| 체중/투약 | `src/app/body.tsx` | 체중 기록, 투약 스케줄 |
| 식단/기호성 | `src/app/food.tsx` | 식단 메모, 기호성 평가 |

## 아키텍처

```
src/
├── app/               # Expo Router 파일 기반 라우팅
│   ├── _layout.tsx    # Supabase 인증 게이트 + CatsProvider
│   ├── index.tsx      # 주기 알람 (탭: 주기 알람)
│   ├── home.tsx       # 고양이 관리 (탭: 홈)
│   ├── hospital.tsx   # 병원 기록 (탭: 병원 기록)
│   ├── body.tsx       # 체중/투약 (탭: 체중/투약)
│   └── food.tsx       # 식단/기호성 (탭: 식단/기호성)
├── components/
│   ├── app-tabs.tsx        # 네이티브 탭 바
│   ├── app-tabs.web.tsx    # 웹 전용 탭 바 (Expo Router UI)
│   ├── bottom-sheet.tsx    # 설정 패널용 바텀시트
│   ├── login-screen.tsx    # Supabase 이메일 로그인
│   ├── medication-section.tsx  # 투약 알림 컴포넌트
│   └── animated-icon.tsx   # 스플래시 애니메이션
└── lib/
    ├── cats-context.tsx    # 멀티캣 전역 상태 (Context API)
    └── supabase.ts         # Supabase 클라이언트
```

## 핵심 기능

- **멀티캣 지원** — CatsContext에서 고양이 CRUD, 품종/이름 기반 아바타 색상 자동 배정
- **D-day 뱃지** — 3일 이내 주황, 14일 이내 빨강, 이후 초록으로 색상 구분
- **병원/모래 주기 설정** — 바텀시트에서 마지막 날짜 + 주기 선택 → 다음 예정일 자동 계산
- **투약 관리** — 반복 일정, 알림 토글
- **Supabase 인증** — 이메일 로그인, 세션 자동 갱신, 개발 모드(DEV)에서는 로그인 생략

## 기술 스택

- **Expo ~56** + Expo Router ~56.2 (파일 기반 라우팅)
- **React 19** / React Native 0.85
- **TypeScript** + React Compiler
- **Supabase** — 인증 및 백엔드
- **expo-image-picker** — 고양이 프로필 사진
- **@react-native-community/datetimepicker** — 날짜 선택
- **react-native-reanimated 4** + **react-native-gesture-handler** — 애니메이션

## 실행

```bash
npm install
npm run web       # 웹 브라우저 (localhost:8081)
npm run android   # Android
npm run ios       # iOS
```

## 빌드 & 배포 (웹)

```bash
npx expo export --platform web   # dist/ 폴더에 정적 파일 생성
# GitHub Pages: gh-pages 브랜치에 dist/ 내용 배포
```

## 개발 노트

### 2026-06-07
- 프로젝트 초기 설정 (Expo 56, Expo Router, TypeScript)
- Supabase 연동, 로그인 화면 구현

### 2026-06-08
- **홈 탭**: 고양이 프로필 CRUD + 사진 업로드 (`home.tsx`)
- **주기 알람 탭**: 병원 방문·모래 교체 D-day 카운트다운, 투약 알림 (`index.tsx`)
- **CatsContext**: 멀티캣 전역 상태 관리 (`cats-context.tsx`)
- **MedicationSection**: 투약 스케줄 컴포넌트
- **BottomSheet**: 날짜·주기 설정 패널
- 웹 전용 탭 바 분리 (`app-tabs.web.tsx`)
- 병원 기록, 체중/투약, 식단/기호성 탭 추가

### 2026-06-09
- 고양이 파비콘 적용
- 개발노트 작성 및 GitHub 배포
