# Vercel 배포 가이드

이 문서는 Next.js 프로젝트를 Vercel에 배포하는 방법을 단계별로 안내합니다.

## 📋 사전 준비사항

배포 전에 다음 항목들을 확인하세요:

1. ✅ **GitHub 계정** (또는 GitLab, Bitbucket)
2. ✅ **Vercel 계정** (무료로 생성 가능)
3. ✅ **프로젝트가 Git 저장소에 푸시되어 있어야 함**

---

## 🚀 배포 단계

### 1단계: GitHub에 코드 푸시하기

프로젝트가 아직 GitHub에 없다면 먼저 푸시해야 합니다.

#### 1-1. Git 저장소 초기화 (아직 안 했다면)

터미널에서 프로젝트 폴더로 이동한 후:

```bash
# Git 저장소 초기화 (이미 했다면 스킵)
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit"
```

#### 1-2. GitHub 저장소 생성 및 연결

1. [GitHub](https://github.com)에 로그인
2. 우측 상단 **"+"** 버튼 → **"New repository"** 클릭
3. 저장소 이름 입력 (예: `fitkong-sns`)
4. **"Create repository"** 클릭
5. GitHub에서 제공하는 명령어를 복사하여 실행:

```bash
# 예시 (실제 URL은 GitHub에서 제공하는 것을 사용)
git remote add origin https://github.com/your-username/fitkong-sns.git
git branch -M main
git push -u origin main
```

---

### 2단계: Vercel 계정 생성 및 프로젝트 연결

#### 2-1. Vercel 계정 생성

1. [Vercel](https://vercel.com)에 접속
2. **"Sign Up"** 클릭
3. **"Continue with GitHub"** 클릭 (GitHub 계정으로 로그인 권장)
4. GitHub 권한 승인

#### 2-2. 새 프로젝트 추가

1. Vercel 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 목록에서 방금 푸시한 프로젝트 선택
3. **"Import"** 클릭

---

### 3단계: 프로젝트 설정

#### 3-1. 빌드 설정 확인

Vercel이 자동으로 Next.js를 감지하지만, 다음 설정을 확인하세요:

- **Framework Preset**: `Next.js` (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `pnpm build` (자동 설정됨)
- **Output Directory**: `.next` (자동 설정됨)
- **Install Command**: `pnpm install` (자동 설정됨)

#### 3-2. 환경 변수 설정

**⚠️ 매우 중요**: 프로젝트가 작동하려면 다음 환경 변수들을 반드시 설정해야 합니다!

**환경 변수 추가 방법:**

1. Vercel 프로젝트 설정 페이지에서 **"Environment Variables"** 섹션 찾기
2. 아래 변수들을 하나씩 추가:

##### Clerk 환경 변수

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

**값 확인 방법:**
- [Clerk Dashboard](https://dashboard.clerk.com/) → 프로젝트 선택 → **API Keys** 메뉴

##### Supabase 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STORAGE_BUCKET=uploads
```

**값 확인 방법:**
- [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택 → **Settings** → **API**

**⚠️ 주의사항:**
- `SUPABASE_SERVICE_ROLE_KEY`는 **절대 공개하지 마세요!** (서버에서만 사용)
- 각 환경 변수 추가 후 **"Save"** 클릭
- 모든 환경 변수를 추가한 후 **"Deploy"** 클릭

#### 3-3. 환경별 설정 (선택사항)

Vercel은 세 가지 환경을 지원합니다:
- **Production**: 실제 사용자에게 제공되는 환경
- **Preview**: Pull Request마다 자동 생성되는 환경
- **Development**: 개발 브랜치용 환경

각 환경에 다른 환경 변수를 설정할 수 있습니다. 대부분의 경우 Production과 Preview에 동일한 값을 사용하면 됩니다.

---

### 4단계: 배포 실행

#### 4-1. 배포 시작

모든 환경 변수를 추가한 후:

1. **"Deploy"** 버튼 클릭
2. 배포 진행 상황을 실시간으로 확인할 수 있습니다
3. 약 2-5분 정도 소요됩니다

#### 4-2. 배포 완료 확인

배포가 완료되면:

1. **"Visit"** 버튼을 클릭하여 사이트 확인
2. 또는 제공된 URL로 접속 (예: `https://your-project.vercel.app`)

---

## 🔧 배포 후 확인사항

### 필수 확인 항목

1. **홈페이지 로드 확인**
   - 배포된 URL로 접속하여 페이지가 정상적으로 로드되는지 확인

2. **인증 기능 테스트**
   - 로그인/회원가입이 정상 작동하는지 확인
   - Clerk 인증이 제대로 작동하는지 확인

3. **데이터베이스 연결 확인**
   - 게시글 작성, 조회 등 데이터베이스 관련 기능 테스트

4. **이미지 업로드 확인**
   - Supabase Storage를 통한 이미지 업로드가 정상 작동하는지 확인

### 문제 발생 시

배포 후 문제가 발생하면:

1. **Vercel 로그 확인**
   - Vercel 대시보드 → 프로젝트 → **"Deployments"** → 최신 배포 클릭 → **"Logs"** 탭
   - 에러 메시지를 확인하여 문제 파악

2. **환경 변수 재확인**
   - 모든 환경 변수가 올바르게 설정되었는지 확인
   - 특히 `NEXT_PUBLIC_`로 시작하는 변수는 클라이언트에서도 사용되므로 공개되어도 안전한 값인지 확인

3. **로컬에서 빌드 테스트**
   ```bash
   pnpm build
   ```
   - 로컬에서 빌드가 성공하는지 확인
   - 빌드 에러가 있다면 먼저 수정

---

## 🔄 자동 배포 설정

### GitHub 연동 시 자동 배포

Vercel과 GitHub를 연동하면:

- **`main` 브랜치에 푸시** → 자동으로 Production 배포
- **다른 브랜치에 푸시** → Preview 배포 생성
- **Pull Request 생성** → Preview 배포 생성

### 커스텀 도메인 설정 (선택사항)

1. Vercel 대시보드 → 프로젝트 → **"Settings"** → **"Domains"**
2. 원하는 도메인 입력
3. DNS 설정 안내에 따라 도메인 제공업체에서 설정

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] GitHub에 코드 푸시 완료
- [ ] Vercel 계정 생성 및 프로젝트 연결
- [ ] 모든 환경 변수 설정 완료
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - [ ] `CLERK_SECRET_KEY`
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_STORAGE_BUCKET`
- [ ] 로컬에서 `pnpm build` 성공 확인
- [ ] 배포 완료 후 기능 테스트

---

## 🆘 자주 묻는 질문 (FAQ)

### Q1: 배포 후 "Environment variables are missing" 에러가 발생해요

**A:** 환경 변수가 제대로 설정되지 않았을 수 있습니다. Vercel 대시보드에서 모든 환경 변수를 다시 확인하고, Production 환경에 설정되어 있는지 확인하세요.

### Q2: 배포는 성공했는데 사이트가 작동하지 않아요

**A:** 
1. 브라우저 콘솔(F12)에서 에러 메시지 확인
2. Vercel 로그에서 서버 에러 확인
3. 환경 변수 값이 올바른지 확인 (특히 URL 형식)

### Q3: 이미지가 표시되지 않아요

**A:**
1. `next.config.ts`의 `remotePatterns` 설정 확인
2. Supabase Storage 버킷이 Public으로 설정되어 있는지 확인
3. 이미지 URL이 올바른지 확인

### Q4: 로그인이 작동하지 않아요

**A:**
1. Clerk 환경 변수가 올바른지 확인
2. Clerk Dashboard에서 Allowed Redirect URLs에 Vercel URL 추가:
   - `https://your-project.vercel.app`
   - `https://your-project.vercel.app/sign-in`
   - `https://your-project.vercel.app/sign-up`

### Q5: 데이터베이스 연결이 안 돼요

**A:**
1. Supabase 환경 변수 확인
2. Supabase Dashboard에서 프로젝트가 활성화되어 있는지 확인
3. Supabase의 Network Restrictions 설정 확인 (필요시 Vercel IP 허용)

---

## 📚 추가 리소스

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Clerk 배포 가이드](https://clerk.com/docs/deployments/overview)
- [Supabase 배포 가이드](https://supabase.com/docs/guides/hosting/overview)

---

**배포 성공을 기원합니다! 🎉**

