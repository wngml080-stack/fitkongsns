# Vercel CLI로 터미널에서 배포하기

이 가이드는 Vercel CLI를 사용하여 터미널에서 직접 배포하는 방법을 안내합니다.

## 📋 사전 준비사항

1. ✅ **터미널 접근 가능** (Mac의 경우 Terminal 앱)
2. ✅ **Vercel 계정** (무료로 생성 가능)
3. ✅ **프로젝트 폴더에 접근 가능**

---

## 🚀 배포 단계

### 1단계: Vercel CLI 설치

터미널을 열고 다음 명령어를 실행하세요:

```bash
npm install -g vercel
```

또는 pnpm을 사용하는 경우:

```bash
pnpm add -g vercel
```

**설치 확인:**
```bash
vercel --version
```

버전 번호가 표시되면 설치가 완료된 것입니다.

---

### 2단계: Vercel에 로그인

터미널에서 다음 명령어를 실행하세요:

```bash
vercel login
```

**로그인 과정:**

1. 명령어 실행 후 브라우저가 자동으로 열립니다
2. Vercel 계정으로 로그인하거나 회원가입
3. "Authorize Vercel CLI" 버튼 클릭
4. 터미널에 "Success! Logged in" 메시지가 표시되면 완료

**이미 로그인되어 있는지 확인:**
```bash
vercel whoami
```

현재 로그인된 이메일이 표시됩니다.

---

### 3단계: 프로젝트 폴더로 이동

터미널에서 프로젝트 폴더로 이동하세요:

```bash
cd /Users/kimsoyeon/Desktop/fitkong/sns/nextjs-supabase-boilerplate-main
```

또는 Finder에서 프로젝트 폴더를 터미널로 드래그 앤 드롭하면 경로가 자동으로 입력됩니다.

---

### 4단계: 환경 변수 준비

배포 전에 환경 변수 값들을 준비해두세요. 다음 값들이 필요합니다:

#### Clerk 환경 변수 (Clerk Dashboard에서 확인)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (보통 `/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` (보통 `/`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` (보통 `/`)

#### Supabase 환경 변수 (Supabase Dashboard에서 확인)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STORAGE_BUCKET` (보통 `uploads`)

**값 확인 위치:**
- **Clerk**: [Clerk Dashboard](https://dashboard.clerk.com/) → 프로젝트 선택 → **API Keys**
- **Supabase**: [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택 → **Settings** → **API**

---

### 5단계: 첫 배포 실행

프로젝트 폴더에서 다음 명령어를 실행하세요:

```bash
vercel
```

**첫 배포 시 질문들:**

1. **Set up and deploy?** → `Y` 입력 후 Enter
2. **Which scope?** → 본인의 계정 선택 (보통 자동으로 선택됨)
3. **Link to existing project?** → `N` 입력 (새 프로젝트 생성)
4. **What's your project's name?** → 프로젝트 이름 입력 (예: `fitkong-sns`) 또는 Enter로 기본값 사용
5. **In which directory is your code located?** → `./` 입력 (현재 폴더)
6. **Want to override the settings?** → `N` 입력 (기본 설정 사용)

**자동 감지되는 설정:**
- Framework: Next.js
- Build Command: `pnpm build` (또는 `npm run build`)
- Output Directory: `.next`
- Install Command: `pnpm install` (또는 `npm install`)

---

### 6단계: 환경 변수 설정

첫 배포 후 환경 변수를 설정해야 합니다. 두 가지 방법이 있습니다:

#### 방법 1: CLI로 환경 변수 추가 (권장)

각 환경 변수를 하나씩 추가합니다:

```bash
# Clerk 환경 변수
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL

# Supabase 환경 변수
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_STORAGE_BUCKET
```

**각 명령어 실행 시:**
1. 값 입력 요청 → 실제 값 붙여넣기 후 Enter
2. 환경 선택 → `Production`, `Preview`, `Development` 중 선택
   - 보통 `Production`과 `Preview` 모두 선택 (스페이스바로 선택, Enter로 확인)

#### 방법 2: .env 파일에서 자동 가져오기

로컬에 `.env` 파일이 있다면:

```bash
vercel env pull .env.production
```

이 명령어는 Vercel의 환경 변수를 로컬 파일로 가져오는 것이므로, 반대로 올리려면:

```bash
# .env 파일의 내용을 Vercel에 설정 (수동으로 하나씩)
# 방법 1을 사용하는 것이 더 안전합니다
```

---

### 7단계: 프로덕션 배포

환경 변수 설정 후 프로덕션 배포:

```bash
vercel --prod
```

또는:

```bash
vercel production
```

**배포 과정:**
- 빌드 시작
- 약 2-5분 소요
- 완료되면 배포 URL이 표시됩니다 (예: `https://your-project.vercel.app`)

---

## 🔄 이후 배포

### 일반 배포 (Preview)

코드를 수정한 후:

```bash
vercel
```

이 명령어는 Preview 환경에 배포됩니다.

### 프로덕션 배포

실제 사용자에게 제공할 버전:

```bash
vercel --prod
```

---

## 📝 유용한 Vercel CLI 명령어

### 프로젝트 정보 확인

```bash
vercel ls
```

배포된 모든 버전 목록 확인

### 특정 배포 확인

```bash
vercel inspect [배포-URL]
```

배포 상세 정보 확인

### 환경 변수 확인

```bash
vercel env ls
```

설정된 환경 변수 목록 확인

### 환경 변수 삭제

```bash
vercel env rm [변수명]
```

### 로그아웃

```bash
vercel logout
```

### 도움말

```bash
vercel --help
```

---

## 🔧 문제 해결

### 문제 1: "Command not found: vercel"

**해결:**
```bash
# npm으로 재설치
npm install -g vercel

# 또는 npx 사용 (설치 없이)
npx vercel
```

### 문제 2: "Login required"

**해결:**
```bash
vercel login
```

### 문제 3: 빌드 에러

**해결:**
1. 로컬에서 빌드 테스트:
   ```bash
   pnpm build
   ```
2. 에러가 있다면 먼저 수정
3. 다시 배포:
   ```bash
   vercel --prod
   ```

### 문제 4: 환경 변수가 적용되지 않음

**해결:**
1. 환경 변수 확인:
   ```bash
   vercel env ls
   ```
2. Production 환경에 설정되어 있는지 확인
3. 재배포:
   ```bash
   vercel --prod
   ```

---

## 📋 배포 체크리스트

배포 전 확인사항:

- [ ] Vercel CLI 설치 완료
- [ ] `vercel login` 완료
- [ ] 프로젝트 폴더로 이동
- [ ] 환경 변수 값 준비 완료
- [ ] `vercel` 명령어로 첫 배포 완료
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
- [ ] `vercel --prod`로 프로덕션 배포 완료
- [ ] 배포된 사이트에서 기능 테스트

---

## 🎯 빠른 참조

### 첫 배포 전체 과정

```bash
# 1. CLI 설치
npm install -g vercel

# 2. 로그인
vercel login

# 3. 프로젝트 폴더로 이동
cd /Users/kimsoyeon/Desktop/fitkong/sns/nextjs-supabase-boilerplate-main

# 4. 첫 배포 (프로젝트 설정)
vercel

# 5. 환경 변수 설정 (각각 실행)
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
# ... 나머지 환경 변수들

# 6. 프로덕션 배포
vercel --prod
```

### 이후 배포

```bash
# Preview 배포
vercel

# 프로덕션 배포
vercel --prod
```

---

## 💡 팁

1. **환경 변수는 한 번만 설정하면 됩니다** - 이후 배포 시 자동으로 사용됩니다
2. **Preview 배포로 먼저 테스트** - `vercel` 명령어로 Preview 환경에 배포하여 테스트한 후 `vercel --prod`로 프로덕션 배포
3. **배포 URL 확인** - 배포 완료 후 터미널에 표시되는 URL을 메모해두세요
4. **Clerk Redirect URL 설정** - 배포 후 Clerk Dashboard에서 배포된 URL을 Allowed Redirect URLs에 추가해야 합니다

---

**터미널 배포 성공을 기원합니다! 🚀**

