import { motion } from 'motion/react';
import { useState } from 'react';
import { Companion } from '../types';
import { COMPANIONS } from '../data';

interface Props {
  onSelect: (c: Companion) => void;
}

export default function CompanionSelector({ onSelect }: Props) {
  const [selectedId, setSelectedId] = useState('analyst');

  const colorMap: Record<string, string> = {
    encourager: '#7C6FFF',
    analyst: '#5EEAD4',
    challenger: '#FF6B6B',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-screen pt-24 pb-32 px-6 flex flex-col items-center"
    >
      <div className="fixed inset-0 neural-grid opacity-30 pointer-events-none" />

      <div className="text-center mb-12 mt-8 space-y-3">
        <span className="label-accent">Core / Companion Selection</span>
        <h1 className="text-4xl font-light text-white tracking-tight">
          Choose your <span className="gradient-text font-semibold">AI Companion</span>
        </h1>
        <p className="text-zinc-500 text-sm">Your companion adapts to your learning style and pushes you to grow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {COMPANIONS.map(c => {
          const isSelected = selectedId === c.id;
          const color = colorMap[c.id];
          return (
            <motion.div
              key={c.id}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedId(c.id)}
              className="relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, rgba(${color === '#7C6FFF' ? '124,111,255' : color === '#5EEAD4' ? '94,234,212' : '255,107,107'},0.1), rgba(15,15,18,0.95))`
                  : 'rgba(15,15,18,0.8)',
                border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isSelected ? `0 0 40px ${color}22` : 'none',
              }}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest"
                  style={{ background: color, color: '#000' }}>SELECTED</div>
              )}

              <div className="p-1">
                <div className="w-full aspect-[4/3] overflow-hidden rounded-lg"
                  style={{ filter: isSelected ? 'none' : 'grayscale(80%) brightness(0.7)' }}>
                  <img src={c.avatar} alt={c.name} className="w-full h-full object-cover object-top transition-all duration-500" />
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold text-white">{c.name}</h3>
                  <span className="text-[9px] font-mono text-zinc-500 tracking-widest">{c.type}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{c.traits}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{c.description}</p>
                <div className="glass-panel rounded-lg p-3 mt-2">
                  <p className="text-xs text-zinc-300 italic">"{c.dialogue}"</p>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onSelect(c); }}
                  className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all mt-2"
                  style={isSelected
                    ? { background: color, color: '#000', boxShadow: `0 0 20px ${color}55` }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {isSelected ? `Deploy ${c.name}` : 'Select'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
