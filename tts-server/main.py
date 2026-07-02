import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

model = None
speaker_id = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model, speaker_id
    from melo.api import TTS

    device = os.getenv("TTS_DEVICE", "cpu")
    model = TTS(language="KR", device=device)
    speaker_id = model.hps.data.spk2id["KR"]
    yield


app = FastAPI(title="buddy-melotts", lifespan=lifespan)


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


@app.get("/health")
def health():
    return {"ok": model is not None}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    if model is None or speaker_id is None:
        raise HTTPException(status_code=503, detail="모델 로딩 중")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text가 비어 있습니다.")

    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        model.tts_to_file(text, speaker_id, path, speed=req.speed)
        with open(path, "rb") as f:
            data = f.read()
    finally:
        if os.path.exists(path):
            os.unlink(path)

    return Response(content=data, media_type="audio/wav")
