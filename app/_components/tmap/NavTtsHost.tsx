"use client";

import { useEffect, useRef } from "react";
import {
  buildNavTtsUtteranceFromInput,
  navTtsChangeKeyFromInput,
  resolveNavScreenDisplay,
  resolveNavTtsMilestone,
  shouldAdvanceNavTtsMilestone,
  getNavTtsMilestoneRank,
} from "@/lib/tmap/nav-screen-display";
import { bindTtsAudioElement } from "@/lib/tts/tts-engine";
import { useSimulationStore } from "@/stores/simulation-store";
import { useTtsStore } from "@/stores/tts-store";

/** 메인 HUD와 동일한 안내를 MeloTTS로 읽음 */
export default function NavTtsHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 마지막으로 재생을 시작한 안내 키 — 재생 중에는 갱신하지 않음 */
  const lastSpokenKeyRef = useRef("");
  /** 매뉴벼별 가장 가까이 안내한 구간 (soon 뒤 100m 역행 방지) */
  const lastMilestoneRef = useRef<{
    maneuverIndex: number;
    rank: number;
  } | null>(null);

  useEffect(() => {
    bindTtsAudioElement(audioRef.current);
    return () => bindTtsAudioElement(null);
  }, []);

  useEffect(() => {
    const sync = () => {
      const tts = useTtsStore.getState();
      const state = useSimulationStore.getState();

      if (!tts.enabled || !state.route) {
        lastSpokenKeyRef.current = "";
        lastMilestoneRef.current = null;
        return;
      }

      if (
        state.status === "running" &&
        state.signalStopRemainingMs > 0
      ) {
        return;
      }

      const input = {
        status: state.status,
        progress: state.progress,
        route: state.route,
        routeSurface: state.routeSurface,
        signalStopRemainingMs: state.signalStopRemainingMs,
        activeSignalStop: state.activeSignalStop,
      };

      const key = navTtsChangeKeyFromInput(input);
      if (key === lastSpokenKeyRef.current) return;

      // 재생·합성 중 — 현재 안내를 끊지 않고, 그 사이 안내는 모두 스킵
      if (tts.speaking) return;

      const display = resolveNavScreenDisplay(input);
      if (!display) return;

      const maneuverIndex = display.nav.upcoming?.index ?? -1;
      const milestone = resolveNavTtsMilestone(display.nav, display.phase);

      if (
        !shouldAdvanceNavTtsMilestone(
          maneuverIndex,
          milestone,
          lastMilestoneRef.current
        )
      ) {
        // 역행 구간(예: soon → 100m) — 재시도 방지용 키만 갱신
        lastSpokenKeyRef.current = key;
        return;
      }

      const utterance = buildNavTtsUtteranceFromInput(input);
      if (!utterance) return;

      lastSpokenKeyRef.current = key;
      lastMilestoneRef.current = {
        maneuverIndex,
        rank: getNavTtsMilestoneRank(milestone),
      };
      void tts.speak(utterance);
    };

    sync();
    const unsubSim = useSimulationStore.subscribe(sync);
    const unsubTts = useTtsStore.subscribe((s, p) => {
      if (s.enabled !== p.enabled) {
        if (!s.enabled) {
          lastSpokenKeyRef.current = "";
          lastMilestoneRef.current = null;
        }
        sync();
        return;
      }
      // 재생 종료 후, 스킵된 구간이 있으면 최신 안내만 1회 재생
      if (p.speaking && !s.speaking) sync();
    });

    return () => {
      unsubSim();
      unsubTts();
    };
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} className="hidden" preload="none" aria-hidden />
  );
}
