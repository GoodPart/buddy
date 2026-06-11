#!/usr/bin/env bash
set -euo pipefail

# buddy/ 루트에서 실행 가정
cd "$(dirname "$0")/.."

# .env 로드
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

: "${STORYBLOK_MANAGEMENT_TOKEN:?STORYBLOK_MANAGEMENT_TOKEN is required}"
: "${STORYBLOK_SPACE_ID:?STORYBLOK_SPACE_ID is required}"

OUT_DIR=".storyblok/components/${STORYBLOK_SPACE_ID}"
mkdir -p "$OUT_DIR"

echo "→ Pulling components..."
curl -sf -H "Authorization: ${STORYBLOK_MANAGEMENT_TOKEN}" \
  "https://mapi.storyblok.com/v1/spaces/${STORYBLOK_SPACE_ID}/components/" \
  | jq '.components' > "${OUT_DIR}/components.json"

echo "→ Generating types..."
npx storyblok types generate --space "${STORYBLOK_SPACE_ID}"

echo "✓ Done: ${OUT_DIR}/components.json + types updated"