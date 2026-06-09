# Buddy — Storyblok 연동 설계서

> 작성 기준: 2026-06-02  
> 대상: Next.js 16 App Router + `@storyblok/react/rsc` + PostgreSQL(Prisma)

---

## 1. 목적

Storyblok CMS와 Next.js 앱 간 연동 방식을 정리하고, 아래 문제를 체계적으로 개선한다.

| 문제 | 현재 상태 |
|------|-----------|
| 타입 안전성 | blok props 대부분 `any` |
| 컴포넌트 이름 불일치 | Storyblok `product-list` ↔ 코드 `product` 등 |
| 미등록 blok | `LendingBrand`, `LatestContents` 등 `storyblok.js` 미등록 |
| 스키마 drift | Storyblok UI 변경 시 코드와 동기화 수동 |
| 환경 분리 | dev/prod space 동기화 절차 없음 |

---

## 2. 아키텍처 원칙

### 2.1 Storyblok vs DB 역할 분담

```
┌─────────────────────────────────────────────────────────┐
│  Storyblok (CMS)                                        │
│  · 페이지 레이아웃, 마케팅 카피, 노출 대상 선택           │
│  · blok 구조, Visual Editor 대상 필드                    │
└───────────────────────┬─────────────────────────────────┘
                        │ sku (연결 키)
                        ▼
┌─────────────────────────────────────────────────────────┐
│  DB (PostgreSQL / Prisma)                               │
│  · 상품 마스터: 가격, 재고, 설명, 이미지                  │
│  · 인증, 주문 등 비즈니스 로직                            │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ 렌더 시 merge
┌─────────────────────────────────────────────────────────┐
│  Next.js Server Component                               │
│  Storyblok fetch → sku 추출 → DB 조회 → mergeProduct()  │
└─────────────────────────────────────────────────────────┘
```

- Storyblok에 DB 데이터를 **복사하지 않는다.** sku만 연결하고 렌더 시점에 병합한다.
- 전체 상품 목록(`/product/list`)은 DB 단독, 큐레이션 페이지(`/product`)는 Storyblok + DB 하이브리드.

### 2.2 Server / Client 분리

| 레이어 | 위치 | 역할 |
|--------|------|------|
| Route Page | `app/*/page.tsx` | story fetch, `StoryblokStory` 또는 blok 전달 |
| Storyblok Blok (Server) | `app/_components/storybloks/*.tsx` | blok 매핑, `storyblokEditable`, 데이터 가공 |
| UI / 인터랙션 (Client) | `app/_components/auth/`, `tabs/` 등 | `useState`, form submit, 탭 전환 |
| Presentational | `app/_components/product/`, `ui/` | props만 받는 순수 UI |

**규칙:** `storybloks/` 파일에 `"use client"` + `useState` 사용 금지.  
예: `Login.tsx` → `LoginForm.tsx`, `LatestContents.tsx` → `TabContent.tsx`

### 2.3 Storyblok CLI vs SDK

| 도구 | 역할 | 필수 여부 |
|------|------|-----------|
| `@storyblok/react/rsc` (SDK) | 런타임 API fetch, blok → React 렌더 | **필수** |
| `storyblok` CLI | 스키마 pull, 타입 생성, space 동기화, CI drift 검사 | **권장** |

CLI는 SDK를 대체하지 않는다. **개발·운영 자동화** 전용.

---

## 3. 현재 구조 (As-Is)

### 3.1 디렉터리

```
app/
├── page.tsx                    # 홈: story 3개 개별 fetch
├── signin/page.tsx             # StoryblokStory
├── signup/page.tsx             # StoryblokStory
├── product/page.tsx            # fetch + 수동 blok 파싱 + DB merge
└── _components/
    ├── storybloks/             # blok ↔ React 매핑 (Server)
    ├── auth/                   # LoginForm, SignupForm (Client)
    ├── tabs/TabContent.tsx     # LatestContentsTabs (Client)
    └── product/Product.tsx     # UI 카드

lib/
├── storyblok.js                # storyblokInit + components 레지스트리
└── product/
    ├── mock-db.ts              # (향후 Prisma Product로 교체)
    ├── get-by-skus.ts
    └── merge.ts
```

### 3.2 페이지별 fetch 패턴

| 페이지 | Story slug | 렌더 방식 |
|--------|------------|-----------|
| `/` | `banner/main-banner`, `lending-brand/lending`, `lending/latest-contents` | blok 컴포넌트에 직접 전달 |
| `/signin` | `signin` | `<StoryblokStory story={} />` |
| `/signup` | `signup` | `<StoryblokStory story={} />` |
| `/product` | `product` | body에서 `product-list` blok 수동 find + DB merge |

### 3.3 컴ponent 레지스트리 vs Storyblok 실제 이름

| Storyblok blok 이름 | `storyblok.js` 등록 | React 파일 | 상태 |
|---------------------|---------------------|------------|------|
| `page` | ✅ `page` | Page.tsx | OK |
| `login` | ✅ `login` | Login.tsx | OK |
| `signup` | ✅ `signup` | Signup.tsx | OK |
| `banner` | ✅ `banner` | Banner.tsx | OK |
| `product-list` | ❌ `product` | Product.tsx | **불일치** |
| `product-card` | ❌ `productItem` | ProductItem.tsx | **불일치** |
| `lendingItem` | ❌ 미등록 | — | 홈에서 직접 파싱 |
| — | ❌ 미등록 | LendingBrand.tsx | **미등록** (직접 import) |
| — | ❌ 미등록 | LatestContents.tsx | **미등록** (직접 import) |

### 3.4 환경 변수

| 변수 | 용도 |
|------|------|
| `STORYBLOK_DELIVERY_API_TOKEN` | 런타임 CDN API (읽기 전용) |
| `STORYBLOK_SPACE_ID` | CLI `--space` (신규) |
| `STORYBLOK_MANAGEMENT_TOKEN` | CLI pull/push (신규, CI용) |

> Delivery token과 Management token은 **별도** 발급.

---

## 4. 목표 구조 (To-Be)

### 4.1 CLI 산출물 (Git 추적)

```
.storyblok/
├── components/                 # components pull 결과 (JSON)
├── types/
│   └── storyblok-components.d.ts # types generate 결과
└── logs/                       # CLI 실행 로그 (gitignore 가능)
```

### 4.2 컴포넌트 이름 규칙

**원칙: Storyblok blok `name` = `storyblok.js` registry key = 1:1**

```
Storyblok UI          storyblok.js           React 컴포넌트
─────────────────────────────────────────────────────────────
product-list      →   product-list       →   ProductList.tsx
product-card      →   product-card       →   ProductCard.tsx
lending-brand     →   lending-brand      →   LendingBrand.tsx
latest-contents   →   latest-contents    →   LatestContents.tsx
```

- camelCase(`productItem`) 대신 **kebab-case(Storyblok 기본)** 를 registry key로 사용.
- React 파일명은 PascalCase, export default.

### 4.3 타입 적용 패턴

```typescript
// lib/storyblok/types.ts (re-export)
export type { ProductListStoryblok, ProductCardStoryblok } from "@/.storyblok/types/...";

// app/_components/storybloks/ProductList.tsx
import type { ProductListStoryblok } from "@/lib/storyblok/types";

type Props = { blok: ProductListStoryblok };

export default function ProductList({ blok }: Props) { ... }
```

- `any` 제거 우선순위: 신규 blok → product → auth → 홈 섹션 → legacy (Feature, Teaser 등)

### 4.4 npm scripts

```json
{
  "storyblok:pull": "storyblok components pull --space $STORYBLOK_SPACE_ID",
  "storyblok:types": "storyblok types generate --space $STORYBLOK_SPACE_ID",
  "storyblok:sync": "npm run storyblok:pull && npm run storyblok:types"
}
```

---

## 5. 구현 단계

### Phase 0 — 준비 (1회, ~30분)

- [ ] `npx storyblok login` (Management API 인증)
- [ ] `.env`에 `STORYBLOK_SPACE_ID=293042638864865` 추가
- [ ] `npm install -D storyblok` (또는 `npx` 유지)
- [ ] `.gitignore` 확인: `.storyblok/logs/` 제외, `components/`·`types/` **포함**

### Phase 1 — 스키마 pull & 타입 생성 (~1시간)

- [ ] `npm run storyblok:sync` 실행
- [ ] pull된 JSON으로 **실제 blok name 목록** 확정
- [ ] `lib/storyblok/types.ts` re-export 파일 생성
- [ ] PR에 `.storyblok/components/`, `.storyblok/types/` 커밋

### Phase 2 — 레지스트리 정렬 (~2시간)

- [ ] `storyblok.js` registry key를 Storyblok name과 1:1 맞춤
- [ ] `product` → `product-list`, `productItem` → `product-card` 등 rename
- [ ] `LendingBrand`, `LatestContents`, `Banner` 등 미등록 blok 등록
- [ ] `app/product/page.tsx`의 `component === "product-list"`와 registry 일치 확인
- [ ] `StoryblokStory` 사용 페이지에서 미등록 blok 경고 제거 확인

### Phase 3 — 타입 적용 (~半日)

- [ ] `storybloks/*.tsx` props `any` → 생성 타입 교체
- [ ] `TabContent.tsx`, `merge.ts` 등 가공 레이어에 blok 타입 연결
- [ ] Storyblok schema 변경 시 `npm run storyblok:sync` → TS 컴파일로 drift 감지

### Phase 4 — 페이지 패턴 통일 (선택, ~半日)

현재 홈은 story 3개를 개별 fetch. 두 가지 방향 중 택일:

| 옵션 | 설명 | 장점 |
|------|------|------|
| A. 현행 유지 | 섹션별 독립 story fetch | 섹션 단위 CMS 편집·캐시 |
| B. 단일 story | 홈 story 1개 + body blok 조합 | fetch 1회, StoryblokStory 일원화 |

**권장:** 단기 A 유지, 중기 B 검토.

### Phase 5 — 환경 동기화 (prod 준비 시)

```bash
# dev → prod blok 스키마
storyblok components push --space $PROD_SPACE_ID --from $DEV_SPACE_ID

# 콘텐츠 (필요 시)
storyblok stories push --space $PROD_SPACE_ID --from $DEV_SPACE_ID
```

- prod 배포 전 `--dry-run` 필수
- Delivery token은 space별 별도 발급

### Phase 6 — CI/CD (~1시간)

```yaml
# .github/workflows/storyblok-schema.yml (예시)
- run: npm run storyblok:sync
  env:
    STORYBLOK_MANAGEMENT_TOKEN: ${{ secrets.STORYBLOK_MANAGEMENT_TOKEN }}
    STORYBLOK_SPACE_ID: ${{ secrets.STORYBLOK_SPACE_ID }}
- run: git diff --exit-code .storyblok/
# → diff 있으면 "스키마 변경됐는데 types 미커밋" 으로 fail
```

---

## 6. 데이터 흐름 (대표 케이스)

### 6.1 인증 페이지 (Storyblok + Client Form)

```
signin/page.tsx (Server)
  └─ get("cdn/stories/signin")
  └─ <StoryblokStory story={} />
       └─ login blok (Server)
            └─ <LoginForm blok={} /> (Client)
                 └─ Zustand auth-store → API
```

### 6.2 상품 큐레이션 (Storyblok + DB)

```
product/page.tsx (Server)
  └─ get("cdn/stories/product")
  └─ body.find(b => b.component === "product-list")
  └─ products[].sku → getProductBySku() → mergeProduct() → ProductComponent
```

### 6.3 최신 컨텐츠 탭 (Storyblok + Client)

```
LatestContents.tsx (Server)
  └─ blok.story.content.body → tabs 데이터 가공
  └─ <LatestContentsTabs tabs={} /> (Client)
       └─ sliceTitle(): "-" → title, "_" → 줄바꿈
```

---

## 7. Storyblok 콘텐츠 작성 가이드 (운영)

### 7.1 상품 blok

- `product-card` blok에 **sku만** 입력 (DB와 동일 값)
- 선택: `marketing_title`, `badge`
- 가격·재고는 DB에서만 관리

### 7.2 카드 title 포맷 (LatestContents)

```
{카테고리}-{설명}_{두 번째 줄}
예: AI-어디서나 구현되는_인텔리전스
```

- 첫 `-`: title / description 분리
- `_`: description 내 줄바꿈

---

## 8. 향후 과제 (본 설계 범위 외)

| 항목 | 설명 |
|------|------|
| Prisma Product 모델 | `mock-db.ts` 교체 |
| Storyblok Datasource | sku 드롭다운 (마케터 수동 입력 완화) |
| Visual Editor bridge | draft/preview URL, `STORYBLOK_PREVIEW_TOKEN` |
| `[...slug]` 동적 라우팅 | 페이지 전면 CMS화 |
| `storyblok create` 재스�affold | 현 구조 유지, 전면 교체 불필요 |

---

## 9. 의사결정 요약

| 결정 | 선택 | 이유 |
|------|------|------|
| CLI 도입 | ✅ 부분 도입 (pull + types + CI) | 타입·drift·동기화 |
| SDK 교체 | ❌ | CLI는 런타임 대체 아님 |
| blok naming | Storyblok name = registry key | 불일치 근본 해소 |
| storybloks/ + Client 분리 | ✅ 유지 | RSC + 프로젝트 컨벤션 |
| 홈 fetch 패턴 | 단기 유지 (3 story) | 변경 비용 대비 효과 낮음 |
| DB ↔ Storyblok | sku 하이brid | 가격·재고 실시간 반영 |

---

## 10. 체크리스트 (완료 정의)

- [ ] `npm run storyblok:sync` 성공
- [ ] `storyblok.js` 모든 사용 blok 등록, 이름 1:1
- [ ] `npx tsc --noEmit` 통과 (blok 타입 적용 후)
- [ ] `/`, `/signin`, `/signup`, `/product` 렌더 정상
- [ ] Storyblok 미등록 component 콘솔 경고 0건
- [ ] CI schema drift job 동작
- [ ] 본 문서 Phase 0~3 완료

---

## 부록: 최소 CLI 실행 명령

```bash
npx storyblok login
npx storyblok components pull --space 293042638864865
npx storyblok types generate --space 293042638864865
```

config 파일 없이 `--space` 플래그만으로 Phase 0~1 진행 가능.
