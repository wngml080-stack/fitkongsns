# Moment 프로젝트 TODO 리스트

## 프로젝트 초기 세팅

- [x] `.cursor/` 디렉토리
  - [x] `rules/` 커서룰
  - [x] `mcp.json` MCP 서버 설정
  - [x] `dir.md` 프로젝트 디렉토리 구조 (docs/DIR.md)
- [ ] `.github/` 디렉토리 (비어있음)
- [ ] `.husky/` 디렉토리
- [ ] `app/` 디렉토리
  - [x] `favicon.ico` 파일
  - [ ] `not-found.tsx` 파일
  - [ ] `robots.ts` 파일
  - [ ] `sitemap.ts` 파일
  - [ ] `manifest.ts` 파일
- [x] `supabase/` 디렉토리
  - [x] `supabase/config.toml` Supabase 프로젝트 설정
  - [x] `supabase/migrations/` 마이그레이션 파일들
    - [x] `setup_schema.sql` (테이블, 뷰, 트리거 생성)
    - [x] `setup_storage.sql` (Storage 버킷 및 RLS 정책)
- [x] `public/` 디렉토리
  - [x] `icons/` 디렉토리
  - [x] `logo.png` 파일
  - [x] `og-image.png` 파일
- [x] `tsconfig.json` 파일
- [x] `.cursorignore` 파일
- [x] `.gitignore` 파일
- [x] `.prettierignore` 파일
- [x] `.prettierrc` 파일
- [x] `eslint.config.mjs` 파일
- [x] `AGENTS.md` 파일
- [x] `README.md` 파일 (프로젝트 문서화)

## 1. 홈 피드 페이지

### 1-1. 기본 세팅
- [x] Next.js + TypeScript 프로젝트 생성
- [x] Tailwind CSS 설정 (인스타 컬러 스키마)
  - [x] `globals.css` 파일 존재 (Instagram 컬러 변수 추가 필요)
  - [x] Instagram 컬러 변수 추가 완료 - OS
  - [x] 타이포그래피 설정 - OS
- [x] Clerk 인증 연동 (한국어 설정)
  - [x] `middleware.ts` Clerk 미들웨어 설정
  - [x] `app/layout.tsx` ClerkProvider 통합
- [x] Supabase 프로젝트 생성 및 연동
  - [x] `lib/supabase/clerk-client.ts` (Client Component용)
  - [x] `lib/supabase/server.ts` (Server Component용)
  - [x] `lib/supabase/service-role.ts` (관리자 권한용)
  - [x] `lib/supabase/client.ts` (공개 데이터용)
- [x] 기본 데이터베이스 테이블 (users, posts, likes, comments, follows)
- [x] 데이터베이스 뷰 (Views)
  - [x] `post_stats` 뷰 (게시물 통계: 좋아요 수, 댓글 수)
  - [x] `user_stats` 뷰 (사용자 통계: 게시물 수, 팔로워 수, 팔로잉 수)
- [x] 데이터베이스 트리거 (Triggers)
  - [x] `handle_updated_at()` 함수 (updated_at 자동 업데이트)
  - [x] posts, comments 테이블에 트리거 적용
- [x] Supabase Storage 버킷 생성 (uploads)
  - [x] Storage RLS 정책 설정 (INSERT, SELECT, DELETE, UPDATE)
- [x] Clerk ↔ Supabase 사용자 동기화
  - [x] `hooks/use-sync-user.ts` 동기화 훅
  - [x] `components/providers/sync-user-provider.tsx` 프로바이더
  - [x] `app/api/sync-user/route.ts` 동기화 API
- [x] shadcn/ui 컴포넌트 설정
  - [x] `components.json` 설정 파일
  - [x] 기본 UI 컴포넌트 (button, dialog, form, input, label, textarea, accordion)
- [x] 테스트 페이지
  - [x] `app/auth-test/page.tsx` (Clerk + Supabase 인증 테스트)
  - [x] `app/storage-test/page.tsx` (Supabase Storage 테스트)
- [x] 기본 컴포넌트
  - [x] `components/Navbar.tsx` 네비게이션 바 (레이아웃 구조로 대체됨)

### 1-2. 레이아웃 구조
- [x] `components/layout/Sidebar.tsx` 컴포넌트
  - [x] Desktop (244px 너비, 아이콘 + 텍스트)
  - [x] Tablet (72px 너비, 아이콘만)
  - [x] Mobile (숨김)
  - [x] Hover 효과 및 Active 상태 스타일
  - [x] 로그인하지 않은 상태에서도 모든 메뉴 표시 (SignInButton으로 감싸기)
  - [x] 다크모드 스타일 적용
  - [x] 다크모드 토글 버튼 추가
- [x] `components/layout/Header.tsx` 컴포넌트 (Mobile 전용)
  - [x] 높이 60px
  - [x] 로고 + 알림/DM/프로필 아이콘
  - [x] 다크모드 스타일 적용
  - [x] 다크모드 토글 버튼 추가
- [x] `components/layout/BottomNav.tsx` 컴포넌트 (Mobile 전용)
  - [x] 높이 50px
  - [x] 5개 아이콘 (홈, 검색, 만들기, 좋아요, 프로필)
  - [x] 로그인하지 않은 상태에서도 모든 메뉴 표시 (SignInButton으로 감싸기)
- [x] `app/(main)/layout.tsx` Route Group 레이아웃
  - [x] Sidebar 통합
  - [x] Mobile Header/BottomNav 통합
  - [x] 반응형 레이아웃 적용
  - [x] 다크모드 배경색 적용
- [x] `app/layout.tsx`에서 기존 Navbar 제거 - OS
- [x] `app/page.tsx`를 `app/(main)/page.tsx`로 이동 및 홈 피드 플레이스홀더 생성 - OS

### 1-3. 홈 피드 - 게시물 목록
- [x] `components/post/PostCard.tsx` 컴포넌트
  - [x] 헤더 (프로필 이미지 32px, 사용자명, 시간, ⋯ 메뉴)
  - [x] 이미지 영역 (1:1 정사각형)
  - [x] 액션 버튼 (❤️ 좋아요, 💬 댓글, ✈️ 공유, 🔖 북마크)
  - [x] 컨텐츠 (좋아요 수, 캡션, 댓글 미리보기 2개)
  - [x] 캡션 2줄 초과 시 "... 더 보기" 처리
  - [x] 게시물 삭제 기능 (본인 게시물만) - OS
    - [x] DropdownMenu로 삭제 옵션 표시
    - [x] 삭제 확인 다이얼로그
    - [x] 삭제 후 피드에서 즉시 제거
- [x] `components/post/PostCardSkeleton.tsx` 로딩 UI
  - [x] Skeleton UI (회색 박스 애니메이션)
  - [x] Shimmer 효과
- [x] `components/post/PostFeed.tsx` 컴포넌트
  - [x] 게시물 목록 표시
  - [x] 시간 역순 정렬
- [x] `app/(main)/page.tsx` 홈 피드 페이지
  - [x] PostFeed 통합
  - [x] 배경색 #FAFAFA
  - [x] PostCard 최대 너비 630px, 중앙 정렬
- [x] `app/api/posts/route.ts` GET API
  - [x] 페이지네이션 (10개씩)
  - [x] 시간 역순 정렬
  - [x] 사용자 정보 포함
  - [x] userId 쿼리 파라미터 지원 (프로필 페이지용) - OS

### 1-4. 홈 피드 - 좋아요 기능
- [x] `likes` 테이블 생성 (이미 완료)
- [x] `app/api/likes/route.ts` API
  - [x] POST: 좋아요 추가
  - [x] DELETE: 좋아요 제거
  - [x] Clerk 인증 확인
  - [x] 중복 좋아요 방지 (UNIQUE 제약 처리)
- [x] 좋아요 버튼 기능
  - [x] 빈 하트 ↔ 빨간 하트 상태 관리
  - [x] 초기 로드 시 좋아요 상태 확인
  - [x] 클릭 애니메이션 (scale 1.3 → 1, 0.15초)
  - [x] 더블탭 좋아요 (모바일, 큰 하트 등장)
  - [x] 로그인하지 않은 사용자: SignInButton으로 감싸기
- [x] 좋아요 수 실시간 업데이트
  - [x] 낙관적 업데이트 (즉시 UI 반영)
  - [x] 에러 시 롤백

## 2. 게시물 작성 & 댓글 기능

### 2-1. 게시물 작성 모달
- [x] `components/post/CreatePostModal.tsx` 컴포넌트
  - [x] Dialog 기반 모달
  - [x] 이미지 업로드 영역 (드래그 앤 드롭 지원)
  - [x] 이미지 미리보기 UI
  - [x] 캡션 입력 필드 (최대 2,200자)
  - [x] "게시" 버튼
  - [x] 업로드 진행 상태 표시
  - [x] 에러 처리 및 사용자 피드백
- [x] Sidebar "만들기" 버튼 클릭 시 모달 열기

### 2-2. 게시물 작성 - 이미지 업로드
- [x] Supabase Storage 버킷 생성 (이미 완료)
- [x] `app/api/posts/route.ts` POST API
  - [x] 이미지 파일 업로드 (최대 5MB 검증)
  - [x] Supabase Storage에 저장
  - [x] posts 테이블에 데이터 저장
  - [x] 파일 타입 검증
  - [x] Clerk 인증 확인
- [x] 파일 업로드 로직 및 검증
  - [x] 이미지 파일만 허용
  - [x] 파일 크기 제한 (5MB)
  - [x] 업로드 진행 상태 표시
  - [x] 게시물 작성 후 피드 자동 새로고침

### 2-3. 댓글 기능 - UI & 작성
- [x] `comments` 테이블 생성 (이미 완료)
- [x] `components/comment/CommentList.tsx` 컴포넌트
  - [x] 댓글 목록 표시 (PostCard에 직접 통합)
  - [x] PostCard: 최신 2개만 미리보기
  - [ ] 상세 모달: 전체 댓글 + 스크롤 (3-4에서 구현 예정)
- [x] `components/comment/CommentForm.tsx` 컴포넌트
  - [x] "댓글 달기..." 입력창
  - [x] Enter 또는 "게시" 버튼으로 제출
  - [x] 로그인하지 않은 사용자: SignInButton으로 감싸기
  - [x] 제출 중 로딩 상태
- [x] `app/api/comments/route.ts` POST API
  - [x] 댓글 작성
  - [x] 사용자 정보 포함
  - [x] Clerk 인증 확인
- [x] PostCard에 CommentForm 통합
  - [x] 댓글 작성 후 즉시 목록 업데이트

### 2-4. 댓글 기능 - 삭제 & 무한스크롤
- [x] `app/api/comments/[commentId]/route.ts` DELETE API
  - [x] 댓글 삭제 (본인만 가능)
  - [x] Clerk 인증 확인
  - [x] 소유권 검증
- [x] 댓글 삭제 버튼 (본인만 표시)
  - [x] PostCard 댓글 미리보기에 삭제 버튼 추가
  - [x] Hover 시 표시 (opacity 전환)
  - [x] 삭제 확인 다이얼로그
- [x] PostFeed 무한 스크롤
  - [x] Intersection Observer 사용
  - [x] 하단 도달 시 10개씩 추가 로드
  - [x] 로딩 상태 표시 (Skeleton UI)
  - [x] hasMore 상태에 따른 로드 제어

## 3. 프로필 페이지 & 팔로우 기능

### 3-1. 프로필 페이지 - 기본 정보
- [x] `app/(main)/profile/[userId]/page.tsx` 동적 라우트
- [x] `components/profile/ProfileHeader.tsx` 컴포넌트
  - [x] 프로필 이미지 (Desktop 150px / Mobile 90px)
  - [x] 사용자명
  - [x] 통계 (게시물 수, 팔로워 수, 팔로잉 수)
  - [x] "팔로우" 또는 "팔로잉" 버튼
  - [x] 본인 프로필: "프로필 편집" 버튼 (1차 제외)
  - [x] 로딩 상태 Skeleton UI - OS
  - [x] 에러 처리 및 재시도 버튼 - OS
  - [x] Clerk 프로필 이미지 연동 - OS
- [x] `app/api/users/[userId]/route.ts` GET API
  - [x] 사용자 정보 조회
  - [x] 통계 정보 포함 (user_stats 뷰 활용)
  - [x] Clerk 프로필 이미지 가져오기 - OS
  - [x] 팔로우 상태 확인 - OS

### 3-2. 프로필 페이지 - 게시물 그리드
- [x] `components/profile/PostGrid.tsx` 컴포넌트
  - [x] 3열 그리드 레이아웃 (반응형)
  - [x] 1:1 정사각형 이미지
  - [x] Hover 시 좋아요/댓글 수 표시
  - [x] 클릭 시 상세 모달/페이지 이동
  - [x] "더 보기" 버튼 (게시물이 많을 경우) - OS
  - [x] 로딩 상태 Skeleton UI - OS
- [x] `app/api/posts/route.ts` 수정
  - [x] userId 쿼리 파라미터 추가
  - [x] 특정 사용자 게시물만 필터링
- [x] 게시물 이미지 썸네일 표시

### 3-3. 팔로우 기능
- [x] `follows` 테이블 생성 (이미 완료)
- [x] `app/api/follows/route.ts` API
  - [x] POST: 팔로우 추가
  - [x] DELETE: 팔로우 제거
  - [x] 자기 자신 팔로우 방지 - OS
  - [x] 중복 팔로우 방지 (UNIQUE 제약 처리) - OS
- [x] 팔로우/언팔로우 버튼
  - [x] 미팔로우: "팔로우" (파란색 #0095f6)
  - [x] 팔로우 중: "팔로잉" (회색)
  - [x] Hover: "언팔로우" (빨간 테두리)
  - [x] 클릭 시 즉시 API 호출 → UI 업데이트
  - [x] 로그인하지 않은 사용자: SignInButton으로 감싸기 - OS
  - [x] 로딩 상태 표시 (버튼 비활성화) - OS
  - [x] 낙관적 업데이트 및 에러 시 롤백 - OS
- [x] 팔로워/팔로잉 수 실시간 업데이트

### 3-4. 게시물 상세 모달 (Desktop)
- [x] `components/post/PostModal.tsx` 컴포넌트
  - [x] Desktop: 모달 형식 (이미지 50% + 댓글 50%)
  - [x] Mobile: 전체화면 모달
  - [x] 이미지 영역
  - [x] 댓글 목록 (스크롤 가능)
  - [x] 좋아요/댓글 액션 버튼
  - [x] 댓글 작성 폼
  - [x] 댓글 삭제 기능 (본인만) - OS
  - [x] 로딩 상태 및 에러 처리 - OS
- [x] PostCard 클릭 시 모달 열기
  - [x] 이미지 클릭 시 모달 열기
  - [x] 댓글 버튼 클릭 시 모달 열기
  - [x] "댓글 모두 보기" 클릭 시 모달 열기
  - [x] 더블탭과 싱글탭 구분 (더블탭: 좋아요, 싱글탭: 모달) - OS
- [x] `app/api/posts/[postId]/route.ts` GET API
  - [x] 단일 게시물 상세 조회
  - [x] 전체 댓글 목록 포함
  - [x] 좋아요 상태 확인
- [x] `app/api/posts/[postId]/route.ts` DELETE API - OS
  - [x] 게시물 삭제 (본인만 가능)
  - [x] Storage에서 이미지 파일 삭제
  - [x] 소유권 검증

## 4. 최종 마무리 & 배포

### 4-1. 반응형 테스트
- [x] 모바일 (< 768px) 테스트 - OS
  - [x] Header/BottomNav 동작 확인
  - [x] PostCard 전체 너비 확인 (모바일: border-x-0, 데스크톱: border-x)
  - [x] 더블탭 좋아요 동작 확인
  - [x] 홈 피드 페이지 반응형 패딩 개선 (모바일: px-0, 데스크톱: px-4)
- [x] 태블릿 (768px ~ 1024px) 테스트 - OS
  - [x] Icon-only Sidebar 동작 확인
  - [x] PostCard 최대 너비 확인
- [x] Desktop (1024px+) 테스트 - OS
  - [x] Full Sidebar 동작 확인
  - [x] PostCard 중앙 정렬 확인

### 4-2. 에러 핸들링 & UI 개선
- [x] 에러 핸들링 - OS
  - [x] API 에러 처리 (`lib/utils/error-handler.ts` 유틸리티 생성)
  - [x] 사용자 친화적 에러 메시지 (HTTP 상태 코드별 메시지)
  - [x] 네트워크 에러 처리 (네트워크 에러 감지 및 메시지)
  - [x] 모든 컴포넌트에 에러 핸들링 적용 (PostFeed, PostCard, PostModal, CreatePostModal, ProfileHeader, PostGrid, CommentForm)
- [x] Skeleton UI 개선 - OS
  - [x] PostCardSkeleton 다크모드 스타일 추가
  - [x] Shimmer 효과 일관성 개선 (다크모드 대응)
  - [x] 모든 로딩 상태에 Skeleton 적용 (이미 완료)
- [x] 애니메이션 최적화 - OS
  - [x] 좋아요 애니메이션 (`animate-like-pulse` 추가, ease-out 적용)
  - [x] 더블탭 하트 애니메이션 (회전 효과 추가, cubic-bezier 적용, 반응형 크기)
  - [x] 모달 열기/닫기 애니메이션 (duration-300 추가)
  - [x] 버튼 hover/active 효과 개선 (active:scale-95 추가)

### 4-3. 배포
- [ ] Vercel 배포
  - [ ] 환경 변수 설정
  - [ ] 도메인 연결
  - [ ] 빌드 확인
- [ ] 프로덕션 환경 테스트
  - [ ] 인증 플로우 확인
  - [ ] 이미지 업로드 확인
  - [ ] 모든 기능 동작 확인

## 5. 추가 완료 작업 (요청 이외)

다음 작업들은 요청 이외에 추가로 완료되었습니다:
- [x] `next.config.ts` 이미지 도메인 설정
  - [x] Unsplash 이미지 도메인 추가 (샘플 데이터용)
  - [x] `images.unsplash.com` remotePatterns에 추가
- [x] 샘플 데이터 추가 SQL
  - [x] `supabase/migrations/sns_schema.sql`에 샘플 데이터 추가
  - [x] 샘플 사용자 4명 (홍길동, 김철수, 이영희, 박민수)
  - [x] 샘플 게시물 6개
  - [x] 샘플 좋아요 11개
  - [x] 샘플 댓글 8개
- [x] `lib/utils/format-time.ts` 유틸리티 함수
  - [x] 상대 시간 포맷팅 함수 (`formatRelativeTime`)
  - [x] "3시간 전", "2일 전" 형식 지원
  - [x] PostCard에서 사용
- [x] 다크모드 기능 구현
  - [x] `components/providers/theme-provider.tsx` 테마 프로바이더 생성
    - [x] 라이트/다크 모드 전환
    - [x] localStorage에 설정 저장
    - [x] 시스템 설정 자동 감지
  - [x] `components/theme-toggle.tsx` 다크모드 토글 버튼 생성
    - [x] 달/태양 아이콘으로 현재 모드 표시
  - [x] `app/layout.tsx`에 ThemeProvider 통합
  - [x] `app/globals.css`에 다크모드 CSS 변수 추가
    - [x] 기본 다크모드 컬러 변수
    - [x] Instagram 컬러 스키마 다크모드 버전
  - [x] 레이아웃 컴포넌트에 다크모드 스타일 적용
    - [x] Sidebar 다크모드 스타일 및 토글 버튼
    - [x] Header 다크모드 스타일 및 토글 버튼
    - [x] MainLayout 다크모드 배경색
- [x] 앱 제목 변경: "SNS" → "Moment"
  - [x] `app/layout.tsx` 메타데이터 제목 변경
  - [x] `components/layout/Sidebar.tsx` 로고 변경 (Desktop: "Moment", Tablet: "M")
  - [x] `components/layout/Header.tsx` 로고 변경

## 6. 1차 MVP 제외 기능 (2차 확장)

다음 기능들은 2차 확장에서 구현 예정:
- [ ] 검색 (사용자, 해시태그)
- [ ] 탐색 페이지
- [ ] 릴스
- [ ] 메시지 (DM)
- [ ] 알림
- [ ] 스토리
- [ ] 동영상
- [ ] 이미지 여러 장
- [ ] 공유 버튼 기능 (현재 UI만 있음)
- [ ] 북마크 기능 (현재 UI만 있음)
- [ ] 프로필 편집 (Clerk 기본 사용)
- [ ] 팔로워/팔로잉 목록 모달
