export type VideoPipSession = {
  video: HTMLVideoElement;
  stream: MediaStream;
  stopCapture?: () => void;
};

let activeSession: VideoPipSession | null = null;

const PIP_MIN_WIDTH = 640;
const PIP_MIN_HEIGHT = 360;

export function isVideoPipSupported(): boolean {
  if (typeof document === "undefined") return false;
  if (!document.pictureInPictureEnabled) return false;
  return typeof HTMLVideoElement.prototype.requestPictureInPicture === "function";
}

export function isVideoPipActive(): boolean {
  return document.pictureInPictureElement != null;
}

function resolvePipSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const rect = canvas.getBoundingClientRect();
  const baseW = Math.round(rect.width || canvas.clientWidth || canvas.width);
  const baseH = Math.round(rect.height || canvas.clientHeight || canvas.height);

  if (baseW <= 0 || baseH <= 0) {
    return { width: PIP_MIN_WIDTH, height: PIP_MIN_HEIGHT };
  }

  const scale = Math.max(PIP_MIN_WIDTH / baseW, PIP_MIN_HEIGHT / baseH, 1);
  return {
    width: Math.min(Math.round(baseW * scale), 1280),
    height: Math.min(Math.round(baseH * scale), 720),
  };
}

function hideVideoOffscreen(video: HTMLVideoElement, width: number, height: number) {
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "0";
  video.style.width = `${width}px`;
  video.style.height = `${height}px`;
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.style.zIndex = "-1";
}

async function waitForVideoDimensions(
  video: HTMLVideoElement,
  minWidth = 64
): Promise<{ width: number; height: number }> {
  const read = () => ({
    width: video.videoWidth,
    height: video.videoHeight,
  });

  for (let i = 0; i < 60; i++) {
    const { width, height } = read();
    if (width >= minWidth && height >= minWidth) {
      return { width, height };
    }
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  return read();
}

function createScaledCaptureStream(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  fps = 30
): { stream: MediaStream; stop: () => void } {
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("PiP 캡처 canvas를 만들 수 없습니다.");
  }

  let running = true;
  const frameInterval = 1000 / fps;
  let lastDraw = 0;

  const draw = (now: number) => {
    if (!running) return;
    if (now - lastDraw >= frameInterval) {
      lastDraw = now;
      try {
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
      } catch {
        /* WebGL readback 실패 시 무시 */
      }
    }
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);

  const captureStream = (
    output as HTMLCanvasElement & { captureStream?(fps?: number): MediaStream }
  ).captureStream;
  if (typeof captureStream !== "function") {
    running = false;
    throw new Error("지도 canvas에서 영상을 캡처할 수 없습니다.");
  }

  return {
    stream: captureStream.call(output, fps),
    stop: () => {
      running = false;
    },
  };
}

function createCaptureStream(
  canvas: HTMLCanvasElement,
  targetSize: { width: number; height: number }
): { stream: MediaStream; stop?: () => void } {
  const directCapture = (
    canvas as HTMLCanvasElement & { captureStream?(fps?: number): MediaStream }
  ).captureStream;

  if (typeof directCapture !== "function") {
    throw new Error("지도 canvas에서 영상을 캡처할 수 없습니다.");
  }

  const directStream = directCapture.call(canvas, 30);
  const [track] = directStream.getVideoTracks();
  const settings = track?.getSettings?.() ?? {};
  const trackW = settings.width ?? canvas.width;
  const trackH = settings.height ?? canvas.height;

  const largeEnough =
    trackW >= PIP_MIN_WIDTH * 0.75 && trackH >= PIP_MIN_HEIGHT * 0.75;

  if (largeEnough) {
    return { stream: directStream };
  }

  directStream.getTracks().forEach((t) => t.stop());
  return createScaledCaptureStream(
    canvas,
    targetSize.width,
    targetSize.height,
    30
  );
}

export async function startVideoPip(canvas: HTMLCanvasElement): Promise<void> {
  if (!isVideoPipSupported()) {
    throw new Error("이 브라우저는 Picture-in-Picture를 지원하지 않습니다.");
  }

  if (document.pictureInPictureElement) {
    await stopVideoPip();
  }

  const targetSize = resolvePipSize(canvas);
  const { stream, stop: stopCapture } = createCaptureStream(canvas, targetSize);

  const video = document.createElement("video");
  hideVideoOffscreen(video, targetSize.width, targetSize.height);
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
  document.body.appendChild(video);

  await video.play();

  const dims = await waitForVideoDimensions(video);
  const displayW = Math.max(dims.width, targetSize.width);
  const displayH = Math.max(dims.height, targetSize.height);
  hideVideoOffscreen(video, displayW, displayH);

  activeSession = { video, stream, stopCapture };

  video.addEventListener(
    "leavepictureinpicture",
    () => {
      if (activeSession?.video === video) {
        const session = activeSession;
        activeSession = null;
        void cleanupSession(session);
      }
    },
    { once: true }
  );

  await video.requestPictureInPicture();
}

async function cleanupSession(session: VideoPipSession | null): Promise<void> {
  if (!session) return;

  session.stopCapture?.();
  session.stream.getTracks().forEach((track) => track.stop());
  session.video.pause();
  session.video.srcObject = null;
  session.video.remove();
}

export async function stopVideoPip(): Promise<void> {
  const session = activeSession;
  activeSession = null;

  if (document.pictureInPictureElement instanceof HTMLVideoElement) {
    try {
      await document.exitPictureInPicture();
    } catch {
      /* ignore */
    }
  }

  await cleanupSession(session);
}
