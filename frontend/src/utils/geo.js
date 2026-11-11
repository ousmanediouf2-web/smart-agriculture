// Surface d'un polygone [[lng, lat], ...] en hectares (projection équirectangulaire locale)
export const polygonAreaHa = (coords) => {
  if (!coords || coords.length < 4) return 0;
  const lat0 = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const mx = 111320 * Math.cos(lat0 * Math.PI / 180);
  const my = 110540;
  const pts = coords.map(([lng, lat]) => [lng * mx, lat * my]);
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) sum += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return Math.abs(sum / 2) / 10000;
};
