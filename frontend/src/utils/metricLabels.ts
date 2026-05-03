/** Human-readable bands for raw velocity (0–1 typical in seed data; cap for display). */

export function velocityHumanLabel(velocity: number): string {
  const v = Math.min(1.5, Math.max(0, Number(velocity) || 0));
  if (v >= 0.85) return 'Breakout';
  if (v >= 0.65) return 'Surging';
  if (v >= 0.45) return 'Acceleration';
  if (v >= 0.25) return 'Steady';
  if (v >= 0.1) return 'Early';
  return 'Quiet';
}

export function velocityBarClass(velocity: number): string {
  const v = Math.min(1.5, Math.max(0, Number(velocity) || 0));
  if (v >= 0.65) return 'metric-bar-fill--hot';
  if (v >= 0.35) return 'metric-bar-fill--warm';
  if (v >= 0.15) return 'metric-bar-fill--mid';
  return 'metric-bar-fill--cool';
}

/** trend_score is 0–1 in API */
export function trendStrengthHuman(score01: number): string {
  const s = Math.min(1, Math.max(0, Number(score01) || 0));
  if (s >= 0.85) return 'Very strong';
  if (s >= 0.65) return 'Strong';
  if (s >= 0.45) return 'Solid';
  if (s >= 0.25) return 'Emerging';
  return 'Niche';
}

export function trendStrengthBarClass(score01: number): string {
  const s = Math.min(1, Math.max(0, Number(score01) || 0));
  if (s >= 0.65) return 'metric-bar-fill--hot';
  if (s >= 0.45) return 'metric-bar-fill--warm';
  return 'metric-bar-fill--mid';
}
