import { UserStats, StudySession, UserMemory } from './types';

const STORAGE_KEY = 'study_ai_stats_v2';

const DEFAULT_STATS: UserStats = {
  totalSeconds: 0,
  streak: 0,
  lastStudyDate: '',
  sessionsCompleted: 0,
  avgRecallScore: 0,
  xp: 0,
  level: 1,
  memory: [],
  achievements: [
    { id: 'first_session', title: 'First Contact', description: 'Complete your first study session', icon: 'zap' },
    { id: 'deep_focus', title: 'Deep Thinker', description: 'Study for more than 45 minutes in one go', icon: 'timer' },
    { id: 'recall_master', title: 'Recall Master', description: 'Get a recall score of 90+', icon: 'brain' },
    { id: 'streak_3', title: 'Triathlon', description: 'Maintain a 3-day streak', icon: 'flame' }
  ],
  sessions: []
};

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function notify(message: string, type: 'xp' | 'level' | 'achievement') {
  window.dispatchEvent(new CustomEvent('stats-update', { detail: { message, type } }));
}

export function loadStats(): UserStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    return JSON.parse(raw) as UserStats;
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(stats: UserStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
}

export function recordSession(session: Omit<StudySession, 'id'>): UserStats {
  const stats = loadStats();
  const today = new Date().toDateString();
  const newSession: StudySession = { ...session, id: Date.now().toString() };

  // Update streak
  const lastDate = stats.lastStudyDate;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newStreak = lastDate === yesterday || lastDate === today
    ? (lastDate === today ? stats.streak : stats.streak + 1)
    : 1;

  // Recalculate avg recall score
  const sessionsWithScore = [...stats.sessions, newSession].filter(s => s.recallScore !== undefined);
  const avgScore = sessionsWithScore.length
    ? Math.round(sessionsWithScore.reduce((acc, s) => acc + (s.recallScore ?? 0), 0) / sessionsWithScore.length)
    : 0;

  // Calculate XP
  const durationXp = Math.floor(session.duration / 60) * 10; // 10 XP per minute
  const recallXp = session.recallScore ? session.recallScore * 2 : 0; // 2x recall score as XP
  const sessionXp = durationXp + recallXp;
  const newTotalXp = stats.xp + sessionXp;
  const newLevel = calculateLevel(newTotalXp);

  // Update memory
  let updatedMemory = [...stats.memory];
  if (session.recallScore !== undefined) {
    const memoryIdx = updatedMemory.findIndex(m => m.subject.toLowerCase() === session.topic.toLowerCase());
    const newMem: UserMemory = {
      subject: session.topic,
      lastRecallScore: session.recallScore,
      lastStudyDate: today,
      weakPoints: [] // Will be populated by AI analysis in future
    };
    if (memoryIdx > -1) updatedMemory[memoryIdx] = newMem;
    else updatedMemory.push(newMem);
  }

  // Check Level up
  if (newLevel > stats.level) {
    notify(`Reached Level ${newLevel}!`, 'level');
  }

  // Check Achievements
  const newlyUnlocked: string[] = [];
  const updatedAchievements = stats.achievements.map(a => {
    if (a.unlockedAt) return a;
    let unlocked = false;
    if (a.id === 'first_session' && stats.sessionsCompleted === 0) unlocked = true;
    if (a.id === 'deep_focus' && session.duration > 45 * 60) unlocked = true;
    if (a.id === 'recall_master' && (session.recallScore ?? 0) >= 90) unlocked = true;
    if (a.id === 'streak_3' && newStreak >= 3) unlocked = true;
    
    if (unlocked) {
      newlyUnlocked.push(a.title);
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });

  newlyUnlocked.forEach(title => notify(`Unlocked: ${title}`, 'achievement'));

  // Notify XP
  if (sessionXp > 0) notify(`+${sessionXp} XP earned`, 'xp');

  const updated: UserStats = {
    totalSeconds: stats.totalSeconds + session.duration,
    streak: newStreak,
    lastStudyDate: today,
    sessionsCompleted: stats.sessionsCompleted + 1,
    avgRecallScore: avgScore,
    xp: newTotalXp,
    level: newLevel,
    memory: updatedMemory,
    achievements: updatedAchievements,
    sessions: [newSession, ...stats.sessions].slice(0, 50)
  };

  saveStats(updated);
  return updated;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
