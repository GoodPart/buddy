export function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

export function formatDuration(seconds: number) {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
