/** Normalise #RGB ou #RRGGBB vers #rrggbb minuscules ; null si invalide. */
export function normalizeHex(hex) {
  let s = (hex || "").trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (s.length === 4 && /^#[0-9a-fA-F]{3}$/.test(s)) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
  return s.toLowerCase();
}

/**
 * Nom d’affichage « palette » à partir du hex (style proche des générateurs type Coolors, en français).
 */
export function hexToDisplayName(hex) {
  const n = normalizeHex(hex);
  if (!n) return "Couleur";

  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const hue = h * 360;

  const hueBuckets = [
    [12, "Rouge brique"],
    [28, "Corail"],
    [42, "Orange brûlé"],
    [58, "Ambre"],
    [72, "Doré"],
    [92, "Chartreuse"],
    [120, "Vert pré"],
    [150, "Émeraude"],
    [175, "Vert d’eau"],
    [195, "Cyan"],
    [215, "Bleu acier"],
    [240, "Bleu roi"],
    [265, "Indigo"],
    [290, "Violet"],
    [315, "Mauve"],
    [335, "Framboise"],
    [360, "Rouge cerise"],
  ];

  let hueName = "Gris";
  for (let i = 0; i < hueBuckets.length; i++) {
    if (hue <= hueBuckets[i][0]) {
      hueName = hueBuckets[i][1];
      break;
    }
  }

  let light;
  if (l > 0.92) light = "Blanc";
  else if (l > 0.75) light = "Pâle";
  else if (l > 0.55) light = "Doux";
  else if (l > 0.35) light = "Profond";
  else if (l > 0.18) light = "Sombre";
  else light = "Noir";

  const sat = max === 0 ? 0 : (max - min) / (1 - Math.abs(2 * l - 1) || 1);
  if (sat < 0.08) {
    if (l > 0.9) return "Blanc pur";
    if (l < 0.12) return "Noir profond";
    return `Gris ${light.toLowerCase()}`;
  }

  return `${light} ${hueName}`;
}
