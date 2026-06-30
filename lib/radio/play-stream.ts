import Hls from "hls.js";

export type StreamPlayback = {
  stop: () => void;
};

export async function attachStreamToAudio(
  audio: HTMLAudioElement,
  streamUrl: string
): Promise<StreamPlayback> {
  const useHls =
    /\.m3u8(\?|$)/i.test(streamUrl) ||
    streamUrl.includes("radio.bsod.kr/stream/");

  if (useHls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(streamUrl);
    hls.attachMedia(audio);
    return {
      stop: () => {
        hls.destroy();
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      },
    };
  }

  if (
    useHls &&
    audio.canPlayType("application/vnd.apple.mpegurl")
  ) {
    audio.src = streamUrl;
    return {
      stop: () => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      },
    };
  }

  audio.src = streamUrl;
  return {
    stop: () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    },
  };
}
