// ANSI color helpers + human number formatting. Honors NO_COLOR.
const noColor = process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true';
const c = (code) => noColor ? '' : `\x1b[${code}m`;

export const color = {
  reset:  c(0),
  dim:    c(2),
  red:    c(31),
  green:  c(32),
  yellow: c(33),
  blue:   c(34),
  magenta:c(35),
  cyan:   c(36),
  gray:   c(90),
  bold:   c(1),
};

export function paint(s, ...codes) {
  if (noColor) return s;
  return codes.join('') + s + color.reset;
}

export function humanTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

export function humanUsd(n) {
  if (n >= 100) return '$' + n.toFixed(0);
  if (n >= 10)  return '$' + n.toFixed(1);
  return '$' + n.toFixed(2);
}

export function humanDuration(ms) {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function pctColor(pct) {
  if (pct >= 90) return color.red;
  if (pct >= 70) return color.yellow;
  return color.green;
}
