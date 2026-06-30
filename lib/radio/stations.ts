import type { RadioStation } from "./types";

/** 수도권 주요 FM — [radio.bsod.kr](https://radio.bsod.kr) 쿼리 형식 */
export const RADIO_STATIONS: RadioStation[] = [
  { id: "kbs-2fm", name: "KBS 2FM", stn: "kbs", ch: "2fm" },
  { id: "mbc-fm4u", name: "MBC FM4U", stn: "mbc", ch: "fm4u" },
  { id: "mbc-sfm", name: "MBC 표준FM", stn: "mbc", ch: "sfm" },
  { id: "sbs-lovefm", name: "SBS 러브FM", stn: "sbs", ch: "lovefm" },
  { id: "sbs-powerfm", name: "SBS 파워FM", stn: "sbs", ch: "powerfm" },
  { id: "tbs-fm", name: "TBS FM", stn: "tbs", ch: "fm" },
  { id: "tbs-efm", name: "TBS eFM", stn: "tbs", ch: "efm" },
  { id: "ebs-fm", name: "EBS FM", stn: "ebs", ch: "fm" },
  { id: "cbs-mfm", name: "CBS 음악FM", stn: "cbs", ch: "mfm" },
  { id: "ytn", name: "YTN 라디오", stn: "ytn" },
];
