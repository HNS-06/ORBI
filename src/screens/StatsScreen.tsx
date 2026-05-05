import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { Timer, Brain, Flame, Target, TrendingUp, BookOpen, Zap } from 'lucide-react';
import { UserStats } from '../types';
import { loadStats, formatDuration } from '../statsService';
import { COMPANIONS } from '../data';

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  if (!stats) return null;

  const levelProgress = (stats.xp % 100);

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-36 px-6 max-w-4xl mx-auto space-y-10">

      <div className="text-center space-y-3">
        <p className="label-geo">Performance Analytics</p>
        <h2 className="text-5xl font-light text-white tracking-tighter uppercase">Subject Mastery</h2>
      </div>

      {/* Level & XP */}
      <div className="geo-panel p-10 flex flex-col md:flex-row items-center gap-10">
        <div className="w-40 h-40 border-2 border-white flex flex-col items-center justify-center relative">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-1">Level</p>
          <p className="text-7xl font-light text-white">{stats.level}</p>
          <div className="absolute bottom-0 left-0 h-1 bg-white" style={{ width: `${levelProgress}%` }} />
        </div>
        
        <div className="flex-1 space-y-6 w-full">
          <div className="flex justify-between items-end">
            <div>
              <p className="label-geo">Experience Buffer</p>
              <p className="text-2xl font-bold text-white uppercase tracking-widest">{stats.xp} Total XP</p>
            </div>
            <p className="text-xs text-zinc-500 uppercase font-mono">{levelProgress}/100 XP TO NEXT</p>
          </div>
          <div className="h-1 bg-zinc-900 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }}
              className="h-full bg-white" transition={{ duration: 1, ease: "easeOut" }} />
          </div>
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-zinc-900">
            <div>
              <p className="label-geo">Streak</p>
              <p className="text-xl font-bold text-white uppercase">{stats.streak} Days</p>
            </div>
            <div>
              <p className="label-geo">Sessions</p>
              <p className="text-xl font-bold text-white uppercase">{stats.sessionsCompleted}</p>
            </div>
            <div>
              <p className="label-geo">Time</p>
              <p className="text-xl font-bold text-white uppercase">{Math.floor(stats.totalSeconds / 3600)}h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Achievements */}
        <div className="geo-panel p-8 space-y-8">
          <div className="flex items-center justify-between">
            <p className="label-geo">System Milestones</p>
            <Target size={16} className="text-zinc-600" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.achievements.map(a => (
              <div key={a.id} className={`p-5 border transition-all ${
                a.unlockedAt ? 'bg-white border-white' : 'bg-black border-zinc-900'
              }`}>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${
                  a.unlockedAt ? 'text-zinc-500' : 'text-zinc-800'
                }`}>Badge</p>
                <p className={`text-xs font-bold uppercase tracking-tight ${
                  a.unlockedAt ? 'text-black' : 'text-zinc-700'
                }`}>{a.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="geo-panel p-8 space-y-8">
          <div className="flex items-center justify-between">
            <p className="label-geo">Session Logs</p>
            <TrendingUp size={16} className="text-zinc-600" />
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide">
            {stats.sessions.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-900 last:border-0">
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">{s.topic}</p>
                  <p className="text-[10px] text-zinc-600 uppercase mt-0.5">{s.date} · {formatDuration(s.duration)}</p>
                </div>
                {s.recallScore && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{s.recallScore}%</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-tighter">RECALL</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Memory */}
      <div className="geo-panel p-8 space-y-8">
        <div className="flex items-center justify-between">
          <p className="label-geo">Neural Subject Clusters</p>
          <Brain size={16} className="text-zinc-600" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.memory.map((m, i) => (
            <div key={i} className="p-6 border border-zinc-900">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">{m.subject}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-[9px] text-zinc-600 uppercase font-mono">Mastery</p>
                  <p className="text-sm font-bold text-white">{m.lastRecallScore}%</p>
                </div>
                <div className="h-0.5 bg-zinc-900">
                  <div className="h-full bg-white" style={{ width: `${m.lastRecallScore}%` }} />
                </div>
                {m.weakPoints.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Optimization Required</p>
                    <p className="text-[10px] text-zinc-400 font-mono leading-tight">{m.weakPoints.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.main>
  );
}
