# 배포 에러 해결 가이드

Vercel 배포 시 발생하는 일반적인 에러와 해결 방법을 안내합니다.

## 🔍 에러 확인 방법

### 1. Vercel 로그 확인

**웹 대시보드에서:**
1. Vercel 대시보드 → 프로젝트 선택
2. **"Deployments"** 탭 클릭
3. 실패한 배포 클릭
4. **"Logs"** 탭에서 에러 메시지 확인

**CLI에서:**
```bash
vercel logs [배포-URL]
```

### 2. 로컬에서 빌드 테스트

배포 전에 로컬에서 빌드가 성공하는지 확인:

```bash
pnpm build
```

로컬에서 실패하면 Vercel에서도 실패합니다.

---

## 🚨 일반적인 에러와 해결 방법

### 에러 1: "Command not found: pnpm"

**증상:**
```
Error: Command "pnpm" not found
```

**원인:** Vercel이 pnpm을 인식하지 못함

**해결 방법:**

1. **`vercel.json` 파일 확인** (이미 생성됨)
   - `vercel.json` 파일이 프로젝트 루트에 있는지 확인
   - 내용 확인:
   ```json
   {
     "buildCommand": "pnpm build",
     "installCommand": "pnpm install",
     "framework": "nextjs",
     "nodeVersion": "20.x"
   }
   ```

2. **`package.json`에 packageManager 추가** (이미 추가됨)
   ```json
   {
     "packageManager": "pnpm@9.0.0",
     "engines": {
       "node": ">=20.0.0",
       "pnpm": ">=9.0.0"
     }
   }
   ```

3. **Vercel 프로젝트 설정에서 확인**
   - Vercel 대시보드 → 프로젝트 → **Settings** → **General**
   - **Install Command**: `pnpm install` 확인
   - **Build Command**: `pnpm build` 확인

---

### 에러 2: "Module not found" 또는 "Cannot find module"

**증상:**
```
Error: Cannot find module 'xxx'
Module not found: Can't resolve 'xxx'
```

**원인:** 
- 의존성 패키지가 설치되지 않음
- 잘못된 import 경로

**해결 방법:**

1. **의존성 재설치**
   ```bash
   # 로컬에서
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

2. **Git에 pnpm-lock.yaml 포함 확인**
   ```bash
   git add pnpm-lock.yaml
   git commit -m "Add pnpm-lock.yaml"
   git push
   ```

3. **import 경로 확인**
   - `@/` 경로가 올바른지 확인
   - 파일 경로가 정확한지 확인

---

### 에러 3: "Environment variables are missing"

**증상:**
```
Error: Missing environment variable: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

**원인:** 환경 변수가 설정되지 않음

**해결 방법:**

1. **필수 환경 변수 확인**
   - Clerk 변수:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
     - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
     - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
   
   - Supabase 변수:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_STORAGE_BUCKET`

2. **Vercel에서 환경 변수 설정**
   - Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**
   - 각 변수를 Production, Preview, Development에 모두 추가

3. **CLI로 환경 변수 확인**
   ```bash
   vercel env ls
   ```

---

### 에러 4: "Build failed" 또는 TypeScript 에러

**증상:**
```
Type error: ...
Build error occurred
```

**원인:** TypeScript 타입 에러 또는 빌드 에러

**해결 방법:**

1. **로컬에서 타입 체크**
   ```bash
   pnpm build
   ```
   로컬에서 에러가 나면 먼저 수정

2. **TypeScript 설정 확인**
   - `tsconfig.json` 확인
   - `noImplicitAny: false`로 설정되어 있어도 명시적 에러는 수정 필요

3. **에러 메시지 확인**
   - 어떤 파일의 몇 번째 줄에서 에러가 나는지 확인
   - 해당 파일 수정

---

### 에러 5: "Out of memory" 또는 빌드 타임아웃

**증상:**
```
Error: JavaScript heap out of memory
Build timeout
```

**원인:** 빌드 시 메모리 부족 또는 빌드 시간 초과

**해결 방법:**

1. **Vercel 빌드 설정 조정**
   - `vercel.json`에 빌드 설정 추가:
   ```json
   {
     "buildCommand": "pnpm build",
     "installCommand": "pnpm install",
     "framework": "nextjs",
     "nodeVersion": "20.x",
     "functions": {
       "app/**/*.ts": {
         "maxDuration": 30
       }
     }
   }
   ```

2. **의존성 최적화**
   - 불필요한 패키지 제거
   - `package.json`에서 사용하지 않는 패키지 삭제

---

### 에러 6: "Image optimization error"

**증상:**
```
Error: Invalid src prop
Image optimization error
```

**원인:** Next.js Image 컴포넌트의 remotePatterns 설정 문제

**해결 방법:**

1. **`next.config.ts` 확인**
   ```typescript
   const nextConfig: NextConfig = {
     images: {
       remotePatterns: [
         { hostname: "img.clerk.com" },
         { hostname: "*.supabase.co" },
         { hostname: "api.dicebear.com" },
         { hostname: "images.unsplash.com" },
       ],
     },
   };
   ```

2. **이미지 URL 확인**
   - 사용하는 이미지 도메인이 `remotePatterns`에 포함되어 있는지 확인

---

### 에러 7: "Clerk authentication error"

**증상:**
```
Error: Clerk authentication failed
Invalid Clerk key
```

**원인:** Clerk 환경 변수 설정 오류

**해결 방법:**

1. **Clerk 키 확인**
   - [Clerk Dashboard](https://dashboard.clerk.com/) → **API Keys**
   - Publishable Key와 Secret Key가 올바른지 확인

2. **환경 변수 형식 확인**
   - 값 앞뒤에 따옴표나 공백이 없는지 확인
   - 전체 값을 정확히 복사했는지 확인

3. **Clerk Redirect URL 설정**
   - Clerk Dashboard → **Settings** → **Paths**
   - Allowed Redirect URLs에 Vercel URL 추가:
     - `https://your-project.vercel.app`
     - `https://your-project.vercel.app/sign-in`
     - `https://your-project.vercel.app/sign-up`

---

### 에러 8: "Supabase connection error"

**증상:**
```
Error: Failed to connect to Supabase
Invalid API key
```

**원인:** Supabase 환경 변수 설정 오류

**해결 방법:**

1. **Supabase 키 확인**
   - [Supabase Dashboard](https://supabase.com/dashboard) → **Settings** → **API**
   - URL과 키가 올바른지 확인

2. **환경 변수 형식 확인**
   - URL은 `https://`로 시작해야 함
   - 키는 전체 값을 정확히 복사

3. **Supabase 프로젝트 상태 확인**
   - 프로젝트가 활성화되어 있는지 확인
   - 일시 중지된 프로젝트는 재개 필요

---

## 🔧 일반적인 해결 절차

에러가 발생했을 때 다음 순서로 확인하세요:

### 1단계: 로컬 빌드 테스트
```bash
pnpm build
```
로컬에서 실패하면 먼저 수정

### 2단계: Git에 푸시
```bash
git add .
git commit -m "Fix build errors"
git push
```

### 3단계: Vercel 로그 확인
- Vercel 대시보드에서 정확한 에러 메시지 확인

### 4단계: 환경 변수 확인
```bash
vercel env ls
```

### 5단계: 재배포
```bash
vercel --prod
```

---

## 📋 배포 전 체크리스트

배포 전에 다음을 확인하세요:

- [ ] 로컬에서 `pnpm build` 성공
- [ ] `vercel.json` 파일 존재 및 올바른 설정
- [ ] `package.json`에 `packageManager` 필드 있음
- [ ] `pnpm-lock.yaml` 파일이 Git에 포함됨
- [ ] 모든 환경 변수가 Vercel에 설정됨
- [ ] TypeScript 에러 없음
- [ ] import 경로가 올바름
- [ ] 이미지 도메인이 `next.config.ts`에 설정됨

---

## 🆘 여전히 해결되지 않으면

1. **에러 메시지 전체 복사**
   - Vercel 로그에서 에러 메시지 전체를 복사

2. **관련 파일 확인**
   - 에러가 발생한 파일과 줄 번호 확인
   - 해당 코드 검토

3. **최소 재현 예제 만들기**
   - 문제가 되는 부분만 따로 테스트

4. **Vercel 지원팀에 문의**
   - [Vercel Support](https://vercel.com/support)

---

## 💡 예방 팁

1. **로컬에서 먼저 테스트**
   - 배포 전에 항상 로컬에서 빌드 테스트

2. **환경 변수 문서화**
   - 필요한 환경 변수를 문서에 정리

3. **점진적 배포**
   - Preview 배포로 먼저 테스트 후 Production 배포

4. **의존성 관리**
   - 불필요한 패키지 제거
   - 정기적으로 업데이트

---

**문제가 해결되지 않으면 에러 메시지를 알려주세요! 🔧**

