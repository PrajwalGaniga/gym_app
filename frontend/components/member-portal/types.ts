export type PortalTab = 'home' | 'calendar' | 'profile';
export type PortalTheme = 'dark' | 'light';

export interface LevelInfo {
  tier: string;
  name: string;
  icon: string;
  minStreak: number;
  nextTierStreak: number;
  color: string;
  progressPercent: number;
  motto: string;
}

export function getLevelInfo(streak: number): LevelInfo {
  if (streak >= 31) {
    return {
      tier: 'legend',
      name: 'Muscle Hunt Legend',
      icon: '👑',
      minStreak: 31,
      nextTierStreak: 100,
      color: '#38bdf8',
      progressPercent: 100,
      motto: 'Peak Fitness God!',
    };
  }
  if (streak >= 15) {
    const range = 31 - 15;
    const progress = Math.min(100, Math.round(((streak - 15) / range) * 100));
    return {
      tier: 'beast',
      name: 'Beast Mode',
      icon: '🏆',
      minStreak: 15,
      nextTierStreak: 31,
      color: '#f97316',
      progressPercent: progress,
      motto: 'Unstoppable Force!',
    };
  }
  if (streak >= 8) {
    const range = 15 - 8;
    const progress = Math.min(100, Math.round(((streak - 8) / range) * 100));
    return {
      tier: 'warrior',
      name: 'Iron Warrior',
      icon: '⚔️',
      minStreak: 8,
      nextTierStreak: 15,
      color: '#eab308',
      progressPercent: progress,
      motto: 'Keep Going!',
    };
  }
  if (streak >= 4) {
    const range = 8 - 4;
    const progress = Math.min(100, Math.round(((streak - 4) / range) * 100));
    return {
      tier: 'trainee',
      name: 'Muscle Trainee',
      icon: '🥈',
      minStreak: 4,
      nextTierStreak: 8,
      color: '#94a3b8',
      progressPercent: progress,
      motto: 'Building Momentum!',
    };
  }
  const progress = Math.min(100, Math.round((Math.max(0, streak) / 4) * 100));
  return {
    tier: 'novice',
    name: 'Novice Lifter',
    icon: '🥉',
    minStreak: 1,
    nextTierStreak: 4,
    color: '#d97706',
    progressPercent: progress,
    motto: 'Starting The Journey!',
  };
}

