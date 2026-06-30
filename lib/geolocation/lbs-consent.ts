const STORAGE_KEY = "buddy-lbs-consent-v1";

export type LbsConsentStatus = "granted" | "denied" | null;

export function getLbsConsent(): LbsConsentStatus {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "granted" || value === "denied") return value;
  return null;
}

export function hasLbsConsent(): boolean {
  return getLbsConsent() === "granted";
}

export function setLbsConsent(granted: boolean) {
  localStorage.setItem(STORAGE_KEY, granted ? "granted" : "denied");
}
