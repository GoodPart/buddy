"""MeloTTS 한국어 전용 패치 — mecab-python3 없이 기동."""
from pathlib import Path
import sys

MELO_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / ".melotts-src"
japanese = MELO_DIR / "melo" / "text" / "japanese.py"
text = japanese.read_text()

old_import = '''try:
    import MeCab
except ImportError as e:
    raise ImportError("Japanese requires mecab-python3 and unidic-lite.") from e'''

new_import = '''try:
    import MeCab
except ImportError:
    MeCab = None  # buddy KR-only server'''

if old_import in text:
    text = text.replace(old_import, new_import)

text = text.replace(
    "_TAGGER = MeCab.Tagger()",
    "_TAGGER = MeCab.Tagger() if MeCab is not None else None",
)

japanese.write_text(text)
print(f"Patched {japanese}")
