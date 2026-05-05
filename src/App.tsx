import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Onboarding from './screens/Onboarding';
import HubScreen from './screens/HubScreen';
import StudyScreen from './screens/StudyScreen';
import RecallScreen from './screens/RecallScreen';
import StatsScreen from './screens/StatsScreen';
import { Companion, ScreenType } from './types';
import { COMPANIONS } from './data';
import { Zap, Star, TrendingUp, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('onboarding');
  const [userName, setUserName] = useState('');
  const [companion, setCompanion] = useState<Companion | null>(COMPANIONS[0]); // Default to ORBI
  const [currentTopic, setCurrentTopic] = useState('');
  const [notifications, setNotifications] = useState<{id: string, type: string, message: string}[]>([]);

  useEffect(() => {
    const savedName = localStorage.getItem('study_ai_username');
    if (savedName) {
      setUserName(savedName);
      setScreen('hub');
    }

    const handleEvent = (e: any) => {
      const { type, payload } = e.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, type, message: payload.message }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
    };

    window.addEventListener('stats-update', handleEvent);
    return () => window.removeEventListener('stats-update', handleEvent);
  }, []);

  const handleUserSetup = (name: string) => {
    setUserName(name);
    localStorage.setItem('study_ai_username', name);
    setScreen('hub'); // Direct jump to Hub
  };

  const handleStartStudy = (topic: string) => {
    setCurrentTopic(topic);
    setScreen('study');
  };

  const handleStartRecall = (topic: string) => {
    setCurrentTopic(topic);
    setScreen('recall');
  };

  const renderScreen = () => {
    if (!companion) return null;

    switch (screen) {
      case 'onboarding':
        return <Onboarding onNext={handleUserSetup} />;
      case 'hub':
        return <HubScreen companion={companion} userName={userName} onStartStudy={handleStartStudy} onStartRecall={handleStartRecall} />;
      case 'study':
        return <StudyScreen companion={companion} topic={currentTopic} userName={userName} onEndSession={() => setScreen('hub')} />;
      case 'recall':
        return <RecallScreen companion={companion} topic={currentTopic} onDone={() => setScreen('hub')} />;
      case 'stats':
        return <StatsScreen />;
      default:
        return <HubScreen companion={companion} userName={userName} onStartStudy={handleStartStudy} onStartRecall={handleStartRecall} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black mesh-bg">
      {/* Global Navigation */}
      {screen !== 'onboarding' && (
        <nav className="fixed top-0 left-0 right-0 h-20 border-b border-zinc-900 bg-black/80 backdrop-blur-md z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setScreen('hub')}>
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <span className="text-black font-bold text-xs">O</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] hidden sm:block">ORBI</span>
          </div>
          <div className="flex gap-8">
            <button onClick={() => setScreen('hub')} className={`text-[10px] font-bold uppercase tracking-widest ${screen === 'hub' ? 'text-white' : 'text-zinc-600 hover:text-white transition-colors'}`}>Hub</button>
            <button onClick={() => setScreen('stats')} className={`text-[10px] font-bold uppercase tracking-widest ${screen === 'stats' ? 'text-white' : 'text-zinc-600 hover:text-white transition-colors'}`}>Stats</button>
          </div>
        </nav>
      )}

      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>

      {/* Professional Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="bg-white text-black px-6 py-4 border border-zinc-800 shadow-2xl flex items-center gap-4 min-w-[280px]">
              {n.type === 'XP_GAIN' && <Zap size={18} />}
              {n.type === 'LEVEL_UP' && <TrendingUp size={18} />}
              {n.type === 'ACHIEVEMENT' && <Star size={18} />}
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{n.type.replace('_', ' ')}</p>
                <p className="text-sm font-bold">{n.message}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}>
                <X size={14} className="opacity-30 hover:opacity-100" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
