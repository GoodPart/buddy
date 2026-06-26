export function haversineMeters(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** cumulative[i] = coordinates[0]~coordinates[i] 누적 거리(m) */
export function buildCumulativeDistances(coordinates: [number, number][]) {
  const cumulative: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    cumulative.push(
      cumulative[i - 1] + haversineMeters(coordinates[i - 1], coordinates[i])
    );
  }
  return cumulative;
}
