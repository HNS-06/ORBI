import { motion } from 'motion/react';
import { useState } from 'react';
import { ChevronRight, Brain } from 'lucide-react';

import { requestMicPermission } from '../voiceService';

interface Props {
  onNext: (name: string) => void;
}

export default function Onboarding({ onNext }: Props) {
  const [name, setName] = useState('');

  const handleStart = async () => {
    if (name.trim()) {
      await requestMicPermission();
      onNext(name.trim());
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
      
      <div className="max-w-md w-full space-y-16">
        <div className="space-y-6 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-white mx-auto flex items-center justify-center">
            <Brain size={32} className="text-black" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tighter uppercase">StudyAI Protocol</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Neural Cognitive Companion</p>
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <label className="label-geo">Operator Identification</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER YOUR NAME..."
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              className="w-full bg-black border-b border-zinc-800 py-4 text-xl font-light focus:border-white outline-none transition-all placeholder:text-zinc-900 uppercase tracking-widest"
              autoFocus
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!name.trim()}
            className={`w-full h-16 flex items-center justify-between px-8 transition-all ${
              name.trim() ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-widest">Initialize System</span>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="pt-12 border-t border-zinc-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="label-geo">V-Core</p>
              <p className="text-[10px] text-zinc-500 font-mono">STT/TTS SYNC ACTIVE</p>
            </div>
            <div>
              <p className="label-geo">A-Core</p>
              <p className="text-[10px] text-zinc-500 font-mono">GEMINI-FLASH_1.5</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
