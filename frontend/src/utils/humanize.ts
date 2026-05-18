/**
 * Utility to convert technical data/finance jargon into plain English
 * for non-tech and non-data-scientist users.
 */

export const humanize = {
  // Metric names
  metric: (key: string): string => {
    const mapping: Record<string, string> = {
      velocity: 'Demand Growth',
      trend_score: 'Hype Level',
      profit_score: 'Profit Potential',
      lifecycle_stage: 'Market Phase',
      competition_level: 'Competition',
      risk_level: 'Risk',
      unit_economics: 'Money Math',
      predicted_growth_14d: '14-Day Forecast',
      suggested_inventory: 'Stock Recommendation',
      entry_timing: 'Best Time to Buy',
    };
    return mapping[key.toLowerCase()] || key;
  },

  // Lifecycle/Phase descriptions
  phase: (stage: string): string => {
    const s = stage.toUpperCase();
    if (s === 'EMERGING') return 'Just Starting 🚀';
    if (s === 'GROWING') return 'Getting Popular 🔥';
    if (s === 'MATURE') return 'Mainstream ✅';
    if (s === 'DECLINING') return 'Fading Out 📉';
    return stage;
  },

  // Competition level descriptions
  competition: (level: string): string => {
    const l = level.toUpperCase();
    if (l === 'LOW') return 'Easy (Few Sellers) ✨';
    if (l === 'MEDIUM') return 'Moderate 🤝';
    if (l === 'HIGH') return 'Crowded (Harder) 🔥';
    return level;
  },

  // Risk descriptions
  risk: (level: string): string => {
    const l = level.toUpperCase();
    if (l === 'LOW') return 'Safe Choice ✅';
    if (l === 'MEDIUM') return 'Some Risk ⚠️';
    if (l === 'HIGH') return 'High Risk 🚩';
    return level;
  },

  // Action humanization
  action: (action: string): string => {
    const a = action.toUpperCase();
    if (a === 'BUY') return 'Get this now! 🛒';
    if (a === 'TEST') return 'Try a few first 🧪';
    if (a === 'WATCH') return 'Keep an eye on it 👀';
    if (a === 'IGNORE') return 'Skip for now ⏭️';
    return action;
  },

  // Summary descriptions
  growth: (percent: number): string => {
    if (percent > 0.5) return 'Exploding! 🚀';
    if (percent > 0.2) return 'Rising fast 📈';
    if (percent > 0) return 'Steady growth';
    if (percent < 0) return 'Slowing down';
    return 'Stable';
  }
};
