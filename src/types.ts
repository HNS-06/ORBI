export type ScreenType = 'onboarding' | 'companion' | 'hub' | 'study' | 'recall' | 'stats';

export interface Companion {
  id: string;
  name: string;
  type: string;
  description: string;
  traits: string;
  dialogue: string;
  avatar: string;
  color: string;
  systemPrompt: string;
}

export interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface StudySession {
  id: string;
  date: string;
  topic: string;
  duration: number; // seconds
  companionId: string;
  recallScore?: number;
  status: 'completed' | 'interrupted' | 'active';
}

export interface RecallAnalysis {
  score: number;
  strengths: string[];
  gaps: string[];
  tips: string[];
  keywords: string[];
  summary: string;
}

export interface UserMemory {
  subject: string;
  weakPoints: string[];
  lastRecallScore: number;
  lastStudyDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserStats {
  totalSeconds: number;
  streak: number;
  lastStudyDate: string;
  sessionsCompleted: number;
  avgRecallScore: number;
  xp: number;
  level: number;
  memory: UserMemory[];
  achievements: Achievement[];
  sessions: StudySession[];
}
