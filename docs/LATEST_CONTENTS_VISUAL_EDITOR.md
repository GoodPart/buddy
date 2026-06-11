# LatestContents — Visual Editor 개선 설명서

> 작성 기준: 2026-06-10  
> 대상: `lending/latest-contents` story + `LatestContents` React 컴포넌트  
> 참고: [STORYBLOK_DESIGN.md](./STORYBLOK_DESIGN.md), [signin/page.tsx](../app/signin/page.tsx) (Visual Editor 동작 예시)

---

## 1. 목적

Storyblok Visual Editor에서 **최신 컨텐츠(latest-contents)** 섹션의 필드(`sectionTitle`, `lendingItem.title/link/img` 등)를 **인라인·사이드바 편집**할 수 있도록 코드와 CMS 구조를 정렬한다.

---

## 2. 현재 문제 (As-Is)

### 2.1 증상

- Storyblok Visual Editor iframe에서 latest-contents 영역 **클릭 편집 불가**
- 사이드바에서 필드 변경 시 preview **실시간 반영 안 됨** (bridge 미연결)

### 2.2 원인 요약

| # | 원인 | 현재 코드 |
|---|------|-----------|
| 1 | **blok이 아닌 API 응답**을 `storyblokEditable`에 전달 | `page.tsx`: `blok={latestContents}` (fetch `{ story }` 전체) |
| 2 | blok을 **plain object로 변환**해 CMS 연결 끊김 | `LatestContents.tsx`: `tabs.map(...)` 후 `img.filename` 문자열만 전달 |
| 3 | **`StoryblokStory` 파이프라인 미사용** | 홈에서 3 story 수동 import·조립 |
| 4 | **registry blok 이름 불일치** | `storyblok.js`: `lending` ← 실제 blok은 `lendingList` |
| 5 | **편집 story ↔ preview URL 불일치** | VE는 `lending/latest-contents` slug로 iframe 로드, 홈(`/`)은 3 story 합성 페이지 |
| 6 | **`lendingItem` blok 미등록** | 중첩 item 필드에 `storyblokEditable` 없음 |

### 2.3 데이터 흐름 (현재 — 문제)

```
Storyblok API fetch
  └─ { story: { content: { component: "page", body: [ lendingList, ... ] } } }
        │
        ▼ page.tsx
  LatestContents blok={latestContents}     ← ❌ story wrapper (blok 아님)
        │
        ▼ LatestContents.tsx
  plain tabs[] → TabContent (client)       ← ❌ CMS 구조 소실
        │
        ▼
  storyblokEditable(blok)                  ← ❌ 잘못된 객체
```

### 2.4 Storyblok 스키마 (기준)

| blok name | React (목표) | 필드 |
|-----------|--------------|------|
| `page` | `Page.tsx` | `body[]` (bloks) |
| `lendingList` | `LendingList.tsx` (신규 분리 권장) | `sectionTitle`, `lendingItem[]` |
| `lendingItem` | `LendingItem.tsx` (신규) | `title`, `link`, `img` (asset) |

Story slug: `lending/latest-contents`  
content root: `page` → `body`에 **`lendingList` blok 여러 개** = 탭 1개당 blok 1개

---

## 3. Visual Editor 동작 조건 (To-Be)

Visual Editor가 필드 편집을 인식하려면 **아래 5가지가 동시에** 충족되어야 한다.

```
① Preview URL + story full_slug 일치
② 편집 중인 story를 StoryblokStory로 렌더
③ blok name ↔ React registry 일치 (lendingList, lendingItem, page)
④ storyblokEditable(올바른 blok) — _uid + component 포함
⑤ version: 'draft' + Preview token (Delivery API)
```

`/signin`이 동작하는 이유:

```tsx
// app/signin/page.tsx
const { data } = await storyblokApi.get("cdn/stories/signin", { version: "draft" });
return <StoryblokStory story={data.story} />;
```

---

## 4. 목표 아키텍처

### 4.1 컴포넌트 역할 분리

```
app/lending/latest-contents/page.tsx   ← story 전용 preview (Visual Editor 진입점)
  └─ StoryblokStory story={data.story}
       └─ Page (page blok)
            └─ body[] → StoryblokServerComponent
                 └─ lendingList → LendingList.tsx (Server)
                      ├─ storyblokEditable(lendingListBlok) on section
                      └─ lendingItem[] → LendingItem.tsx
                           └─ storyblokEditable(itemBlok) on card fields
                      └─ LatestContentsTabs (Client) ← 탭 UI·상태만
```

| 레이어 | 파일 | 역할 |
|--------|------|------|
| Route | `app/lending/latest-contents/page.tsx` | story fetch + `StoryblokStory` |
| Root blok | `storybloks/Page.tsx` | `body` 순회 (기존) |
| Section blok | `storybloks/LendingList.tsx` | 탭 1개 = `lendingList` blok |
| Item blok | `storybloks/LendingItem.tsx` | 카드 1개 = `lendingItem` blok |
| Client UI | `tabs/TabContent.tsx` | `useState` 탭 전환만, **blok 가공 금지** |
| Registry | `lib/storyblok.js` | `lendingList`, `lendingItem` 등록 |

> `LatestContents.tsx`는 **story wrapper용**이었으므로, 역할 분리 후 `LendingList.tsx`로 대체하거나 story 전용 layout wrapper로 축소한다.

### 4.2 데이터 흐름 (목표)

```
Storyblok: lending/latest-contents (page)
  body: [ lendingList, lendingList, lendingList ]
        │
        ▼ StoryblokStory → Page → lendingList × N
        │
        ▼ LendingList (Server, blok 유지)
  storyblokEditable(sectionBlok) + LendingItem(blok) × N
        │
        ▼ LatestContentsTabs (Client)
  activeIndex만 관리, children/slots은 Server에서 렌더된 DOM 유지
```

---

## 5. 구현 단계

### Phase 0 — Storyblok CMS 확인 (~15분)

- [ ] Content → story `lending/latest-contents` 존재 확인
- [ ] Content type = **`page`**
- [ ] `body`에 **`lendingList` blok** 2개 이상 (탭별 1개)
- [ ] 각 `lendingList` → `lendingItem` 중첩 blok 채워짐
- [ ] **Settings → Visual Editor → Preview URLs**
  - Name: `Dev`
  - Location: `https://localhost:3001/` (또는 실제 dev 포트·프로토콜)
- [ ] story **full_slug** = `lending/latest-contents` → preview URL = `https://localhost:3001/lending/latest-contents`

> slug와 Next.js 경로가 다르면 **Real path** 또는 Next.js `rewrite`로 맞춘다. ([depth1 slug 이슈와 동일 패턴](./STORYBLOK_DESIGN.md))

---

### Phase 1 — story 전용 preview 라우트 (~30분)

**신규:** `app/lending/latest-contents/page.tsx`

```tsx
import { getStoryblokApi } from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";

export default async function LatestContentsStoryPage() {
  const storyblokApi = getStoryblokApi();
  const { data } = await storyblokApi.get("cdn/stories/lending/latest-contents", {
    version: "draft",
  });

  return <StoryblokStory story={data.story} />;
}
```

- Visual Editor는 **이 URL**에서 story를 연다. 홈(`/`)이 아님.
- 홈에서 latest-contents를 보여주려면 기존처럼 `page.tsx` import 유지 가능 (편집은 전용 URL에서).

---

### Phase 2 — registry 정렬 (~20분)

**`lib/storyblok.js` 수정:**

```js
// ❌ 현재
lending: LatestContents

// ✅ 목표
lendingList: LendingList,
lendingItem: LendingItem,
```

| Storyblok blok | Registry key | React 파일 |
|----------------|--------------|------------|
| `page` | `page` | `Page.tsx` |
| `lendingList` | `lendingList` | `LendingList.tsx` |
| `lendingItem` | `lendingItem` | `LendingItem.tsx` |

---

### Phase 3 — blok 컴포넌트 분리 (~1–2시간)

#### 3.1 `LendingItem.tsx` (Server)

```tsx
import type { LendingItem as LendingItemType } from "@/.storyblok/types/.../storyblok-components";
import { SbBlokData, storyblokEditable } from "@storyblok/react/rsc";

export default function LendingItem({ blok }: { blok: LendingItemType }) {
  const imgUrl = blok.img?.filename ?? "";
  // sliceTitle 등 표시 로직
  return (
    <div className="card ..." {...storyblokEditable(blok as SbBlokData)}>
      {/* title, link, img — blok 필드 직접 참조 */}
    </div>
  );
}
```

- **plain object 변환 금지** — `blok.title`, `blok.img?.filename` 직접 사용
- asset은 `blok.img.filename` (Storyblok asset shape 유지)

#### 3.2 `LendingList.tsx` (Server)

```tsx
import type { LendingList as LendingListType } from "@/.storyblok/types/.../storyblok-components";
import { SbBlokData, storyblokEditable, StoryblokServerComponent } from "@storyblok/react/rsc";

export default function LendingList({ blok }: { blok: LendingListType }) {
  return (
    <section {...storyblokEditable(blok as SbBlokData)}>
      <h3>{blok.sectionTitle}</h3>
      {blok.lendingItem?.map((item) => (
        <StoryblokServerComponent blok={item} key={item._uid} />
      ))}
    </section>
  );
}
```

#### 3.3 탭 UI + Visual Editor (Client/Server 협업)

**문제:** 탭은 Client `useState` 필요, Visual Editor는 Server DOM의 `storyblokEditable` 필요.

**권장 패턴 — 탭 버튼만 Client, 패널은 Server에서 전부 렌더:**

```tsx
// LendingListTabs.tsx (Server) — page body 전체를 받는 wrapper (선택)
// 또는 Page.tsx 대신 latest-contents 전용 page blok preset

// LatestContentsTabsShell.tsx (Client)
// props: { sections: ReactNode[] } — Server에서 이미 렌더된 lendingList 패널
// CSS로 비활성 탭 hidden (visibility/opacity, DOM 유지 → bridge 추적 가능)
```

- 비활성 탭을 `display: none` + DOM에서 **제거**하면 해당 필드 inline highlight가 어려울 수 있음
- **사이드바 편집**은 DOM visibility와 무관하게 동작
- inline 클릭 편집까지 필요하면 **모든 탭 패널을 DOM에 유지**하고 CSS로 숨김

---

### Phase 4 — 홈(`app/page.tsx`) 정리 (~30분)

현재:

```tsx
<LatestContents blok={latestContents} />  // ❌ API wrapper
```

**옵션 A — 홈에서는 blok slice 전달 (최소 수정):**

```tsx
// latest-contents story의 body(lendingList[])만 추출해 wrapper에 전달
const sections = latestContents.story.content.body;
<LatestContentsTabbed sections={sections} />
```

**옵션 B — 홈에서 latest-contents story도 StoryblokStory로 embed (권장하지 않음, page 중첩 복잡)**

**옵션 C — 홈 preview는 정적 조립, 편집은 `/lending/latest-contents`에서만**

| | 홈 `/` | VE preview |
|--|--------|------------|
| 렌더 | 수동 import (기존) | `StoryblokStory` |
| 편집 | ❌ | ✅ |

초기에는 **옵션 C**로 VE를 먼저 안정화한 뒤, 홈 연동(옵션 A)을 Phase 5로 진행.

---

### Phase 5 — 타입 적용 (~30분)

- [ ] `LatestContents.tsx`의 `blok: any` 제거
- [ ] `LendingList`, `LendingItem` generated types 사용
- [ ] `npm run storyblok:pull_types-bash` 후 types drift 확인

---

## 6. Storyblok ↔ Next.js 경로 매핑

| Storyblok | Next.js | Visual Editor iframe |
|-----------|---------|----------------------|
| story slug `lending/latest-contents` | `app/lending/latest-contents/page.tsx` | `https://localhost:3001/lending/latest-contents` |

폴더 `lending` + story `latest-contents` = full_slug `lending/latest-contents`  
→ Next.js 파일 경로 **`app/lending/latest-contents/page.tsx`** 와 **1:1 대응** (Dynamic Routing 없이도 가능)

---

## 7. 검증 체크리스트

### Visual Editor

- [ ] Storyblok에서 `lending/latest-contents` story 열기
- [ ] Preview URL `Dev` 선택, iframe 로드 성공
- [ ] `sectionTitle` 클릭 → 사이드바 필드 포커스
- [ ] `lendingItem` title/link/img 편집 → iframe 실시간 반영
- [ ] draft 저장 후 refresh 시 변경 유지

### 코드

- [ ] `storyblok.js`에 `lendingList`, `lendingItem` 등록
- [ ] `storyblokEditable`에 `_uid` 있는 blok 전달 (API wrapper ❌)
- [ ] plain object map으로 blok 변환하지 않음
- [ ] `version: 'draft'` fetch

### 회귀

- [ ] 홈(`/`) latest-contents 섹션 정상 표시 (Phase 4 적용 후)
- [ ] 탭 전환 동작
- [ ] 이미지 없을 때 fallback UI

---

## 8. 흔한 실수

| 실수 | 결과 |
|------|------|
| `blok={data}` (fetch 전체) | VE 연결 안 됨 |
| `img: lending.img.filename`만 Client에 전달 | asset 필드 편집 불가 |
| registry `lending` ≠ blok `lendingList` | StoryblokServerComponent 렌더 실패 |
| 홈(`/`)에서 VE story 편집 시도 | 3 story 합성 페이지라 bridge 불일치 |
| Preview URL `http` vs `https` 불일치 | iframe blank |

---

## 9. 작업 순서 요약

```
Phase 0  CMS·Preview URL 확인
   ↓
Phase 1  app/lending/latest-contents/page.tsx + StoryblokStory
   ↓
Phase 2  registry: lendingList, lendingItem
   ↓
Phase 3  LendingList.tsx, LendingItem.tsx + 탭 Client 분리
   ↓
Phase 4  app/page.tsx 홈 연동 정리
   ↓
Phase 5  generated types 적용
   ↓
Phase 7  Visual Editor 검증
```

---

## 10. 참고 — LendingBrand도 동일 패턴

`LendingBrand.tsx`도 `blok={lendingBrand}` (API wrapper) + `storyblokEditable(blok)` 패턴이라 **동일한 VE 문제**가 있다.  
latest-contents 개선 후 **lending-brand/lending** story에 같은 Phase 1–3 패턴을 적용한다.

---

## 11. 관련 파일

| 파일 | Phase |
|------|-------|
| `app/lending/latest-contents/page.tsx` | 1 (신규) |
| `lib/storyblok.js` | 2 |
| `app/_components/storybloks/LendingList.tsx` | 3 (신규) |
| `app/_components/storybloks/LendingItem.tsx` | 3 (신규) |
| `app/_components/storybloks/LatestContents.tsx` | 3–4 (축소·대체) |
| `app/_components/tabs/TabContent.tsx` | 3 (Client 역할만) |
| `app/page.tsx` | 4 |
