#!/usr/bin/env bash
# MeloTTS 로컬 서버 — Docker 없이 npm run tts:setup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/.venv"
MELO_DIR="$ROOT/.melotts-src"

pick_python() {
  for cmd in python3.11 python3.10 python3.12; do
    if command -v "$cmd" >/dev/null 2>&1; then
      echo "$cmd"
      return 0
    fi
  done
  return 1
}

if ! PYTHON="$(pick_python)"; then
  echo "Python 3.10~3.12가 필요합니다. (시스템 python3: $(python3 --version 2>/dev/null || echo unknown))"
  echo "  brew install python@3.11"
  exit 1
fi

echo "Using $PYTHON ($("$PYTHON" --version))"

if [[ ! -d "$MELO_DIR" ]]; then
  git clone --depth 1 https://github.com/myshell-ai/MeloTTS.git "$MELO_DIR"
fi

"$PYTHON" "$ROOT/patch-melo-kr.py" "$MELO_DIR"

if [[ -d "$VENV" ]]; then
  VENV_VER="$("$VENV/bin/python" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "")"
  WANT_VER="$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  if [[ "$VENV_VER" != "$WANT_VER" ]]; then
    echo "venv Python $VENV_VER → $WANT_VER 재생성"
    rm -rf "$VENV"
  fi
fi

if [[ ! -d "$VENV" ]]; then
  "$PYTHON" -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

pip install --upgrade pip
pip install torch==2.3.1 torchaudio==2.3.1
grep -Ev '^(torch|torchaudio|gradio|tensorboard|mecab-python3)' "$MELO_DIR/requirements.txt" > /tmp/melo-reqs.txt
pip install -r /tmp/melo-reqs.txt
pip install python-mecab-ko
pip install -e "$MELO_DIR" --no-deps
pip install -r "$ROOT/requirements.txt"

python -m unidic download 2>/dev/null || true
python -c "import nltk; nltk.download('averaged_perceptron_tagger_eng')" 2>/dev/null || true

echo ""
echo "준비 완료. TTS 서버: npm run tts:dev"
