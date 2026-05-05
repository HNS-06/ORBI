import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Mic, MicOff, Send, RefreshCw, Volume2, VolumeX, Zap, ChevronDown, X, Sparkles, HelpCircle, Play, Pause } from 'lucide-react';
import { Companion, Message } from '../types';
import { chatWithCompanion, getAICheckin } from '../aiService';
import { speak, stopSpeaking, stopSTT, startSTT } from '../voiceService';
import { formatTime, recordSession, loadStats } from '../statsService';
import VoiceController from '../components/VoiceController';
import { FOCUS_TRACKS } from '../data';

interface Props {
  companion: Companion;
  topic: string;
  userName: string;
  onEndSession: () => void;
}

interface Goal {
  id: number;
  text: string;
  completed: boolean;
}

export default function StudyScreen({ companion, topic, userName, onEndSession }: Props) {
  const [stats] = useState(loadStats());
  const [memoryContext, setMemoryContext] = useState('');
  
  useEffect(() => {
    const mem = stats.memory.find(m => m.subject.toLowerCase() === topic.toLowerCase());
    if (mem) {
      setMemoryContext(`User last studied this on ${mem.lastStudyDate} and scored ${mem.lastRecallScore}/100. ${mem.weakPoints.length > 0 ? `Weak areas: ${mem.weakPoints.join(', ')}` : ''}`);
    }
  }, [stats, topic]);

  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showDurPicker, setShowDurPicker] = useState(false);

  const [goals, setGoals] = useState<Goal[]>([
    { id: 1, text: 'Grasp fundamental concepts', completed: false },
    { id: 2, text: 'Active recall session', completed: false }
  ]);
  const [newGoal, setNewGoal] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `System online for "${topic}". ${companion.dialogue}`, timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListeningChat, setIsListeningChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [lastCheckin, setLastCheckin] = useState(0);
  const checkinRef = useRef(false);

  useEffect(() => {
    if (!isRunning) { setTimeLeft(duration * 60); return; }
  }, [duration, isRunning]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(p => p - 1);
      setElapsed(p => p + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (!isRunning || checkinRef.current) return;
    const elapsedMin = Math.floor(elapsed / 60);
    const checkinInterval = 15; 
    
    if (elapsedMin > 0 && elapsedMin % checkinInterval === 0 && elapsed !== lastCheckin) {
      checkinRef.current = true;
      setLastCheckin(elapsed);
      getAICheckin(companion.name, topic, elapsedMin).then(msg => {
        setMessages(p => [...p, { role: 'ai', text: msg, timestamp: Date.now() }]);
        speak(msg);
        checkinRef.current = false;
      });
    }

    if (elapsedMin === 50 && elapsed % 60 === 0) {
      const breakMsg = "Sustained focus detected (50m). Efficiency declining. System recommends 5-min neural reset.";
      setMessages(p => [...p, { role: 'ai', text: breakMsg, timestamp: Date.now() }]);
      speak(breakMsg);
      setIsRunning(false); 
    }
  }, [elapsed, isRunning, companion.name, topic, lastCheckin]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if (audio.src !== FOCUS_TRACKS[trackIdx].url) { audio.src = FOCUS_TRACKS[trackIdx].url; audio.loop = true; }
    audio.volume = volume;
    isPlaying ? audio.play().catch(() => {}) : audio.pause();
  }, [isPlaying, trackIdx]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; stopSTT(); stopSpeaking(); }, []);

  const [liveChatText, setLiveChatText] = useState('');

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) {
      setIsListeningChat(true); // resume listening if empty
      return;
    }
    const userMsg: Message = { role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(p => [...p, userMsg]);
    setChatInput('');
    setLiveChatText('');
    setIsListeningChat(false);
    setIsThinking(true);
    
    try {
      const reply = await chatWithCompanion(companion.systemPrompt, messages, text.trim(), memoryContext);
      setMessages(p => [...p, { role: 'ai', text: reply, timestamp: Date.now() }]);
      setIsThinking(false);
      speak(reply, { onEnd: () => setIsListeningChat(true) });
    } catch (err) {
      setIsThinking(false);
      speak("Didn't catch that, try again.", { onEnd: () => setIsListeningChat(true) });
    }
  }, [companion.systemPrompt, messages, memoryContext]);

  const handleSimpler = async () => {
    const lastAIMsg = [...messages].reverse().find(m => m.role === 'ai');
    if (!lastAIMsg) return;
    setIsThinking(true);
    const reply = await chatWithCompanion(companion.systemPrompt, messages, "Simplify the last concept for direct neural mapping. Use plain terms.", memoryContext);
    setMessages(p => [...p, { role: 'ai', text: reply, timestamp: Date.now() }]);
    setIsThinking(false);
    speak(reply, { onEnd: () => setIsListeningChat(true) });
  };

  const handleConfusion = useCallback(() => {
    if (liveChatText.trim().length > 2) {
      sendMessage(liveChatText);
      return;
    }
    const msg = "Signal hesitation detected. Need clarification or simplification?";
    setMessages(p => [...p, { role: 'ai', text: msg, timestamp: Date.now() }]);
    speak(msg, { onEnd: () => setIsListeningChat(true) });
    setLiveChatText('');
  }, [liveChatText, sendMessage]);

  const handleEnd = () => {
    stopSpeaking(); stopSTT();
    audioRef.current?.pause();
    recordSession({ date: new Date().toDateString(), topic, duration: elapsed, companionId: companion.id, status: elapsed > 60 ? 'completed' : 'interrupted' });
    onEndSession();
  };

  const progress = timeLeft / (duration * 60);
  const circumference = 2 * Math.PI * 110;

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-36 px-4 max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between geo-panel px-6 py-4">
        <div>
          <p className="label-geo">Protocol / Focus</p>
          <p className="text-white font-bold text-lg uppercase tracking-widest">{topic}</p>
        </div>
        <button onClick={handleEnd}
          className="btn-ghost border-white/20 text-white hover:bg-white hover:text-black">
          Terminate Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Timer + Controls */}
        <div className="space-y-6">
          <div className="geo-panel p-10 flex flex-col items-center gap-8">
            <div className="relative">
              <svg width="260" height="260" className="-rotate-90">
                <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <circle cx="130" cy="130" r="110" fill="none" strokeWidth="2"
                  stroke="#FFFFFF"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  strokeLinecap="square"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-light text-white tracking-tighter">{formatTime(timeLeft)}</span>
                <button onClick={() => setShowDurPicker(p => !p)}
                  className="label-geo mt-4 hover:text-white transition-colors">
                  Set Duration: {duration}m
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showDurPicker && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex gap-2">
                  {[15, 25, 45, 60].map(m => (
                    <button key={m} onClick={() => { setDuration(m); setTimeLeft(m * 60); setShowDurPicker(false); }}
                      className={`w-12 h-12 border text-xs font-bold transition-all ${duration === m ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}>
                      {m}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-10">
              <button onClick={() => { setIsRunning(false); setTimeLeft(duration * 60); setElapsed(0); }}
                className="w-14 h-14 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-white hover:text-white transition-all">
                <RefreshCw size={20} />
              </button>
              <button onClick={() => setIsRunning(p => !p)}
                className="w-20 h-20 bg-white flex items-center justify-center transition-all">
                {isRunning ? <Pause size={32} className="text-black" /> : <Play size={32} className="text-black ml-1" />}
              </button>
              <button onClick={() => speak("System analysis continuing. Focus depth optimal.")}
                className="w-14 h-14 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-white hover:text-white transition-all">
                <Zap size={20} />
              </button>
            </div>
          </div>

          <div className="geo-panel p-6 space-y-6">
            <p className="label-geo">Focus Objectives</p>
            <div className="space-y-3">
              {goals.map(goal => (
                <div key={goal.id} className="flex items-center gap-4 group">
                  <button 
                    onClick={() => setGoals(p => p.map(g => g.id === goal.id ? {...g, completed: !g.completed} : g))}
                    className={`w-5 h-5 border flex items-center justify-center ${goal.completed ? 'bg-white border-white' : 'border-zinc-800'}`}
                  >
                    {goal.completed && <X size={14} className="text-black" />}
                  </button>
                  <span className={`text-sm flex-1 ${goal.completed ? 'text-zinc-600 line-through' : 'text-white'}`}>
                    {goal.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Minimalist Chat */}
        <div className="geo-panel flex flex-col h-[650px] overflow-hidden">
          <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white overflow-hidden p-0.5">
                <img src={companion.avatar} alt={companion.name} className="w-full h-full object-cover grayscale" />
              </div>
              <div>
                <p className="text-white font-bold text-sm uppercase tracking-widest">{companion.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Neural Link Sync</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleSimpler} className="text-zinc-500 hover:text-white transition-colors">
                <HelpCircle size={18} />
              </button>
              <Sparkles size={18} className="text-white animate-pulse" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-4 border text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-white text-black border-white' : 'bg-black text-white border-zinc-800'
                }`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="flex gap-1.5 p-2">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 bg-white"
                      animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.8, delay: i * 0.1, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            ) }
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 border-t border-zinc-900 space-y-6">
            <AnimatePresence>
              {liveChatText && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-black border border-white px-5 py-4 text-xs text-zinc-400 uppercase tracking-widest">
                  Receiving Signal: <span className="text-white">{liveChatText}</span>...
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex justify-center">
              <VoiceController 
                isListening={isListeningChat} 
                onTranscript={(t, final) => {
                  if (final) sendMessage(t);
                  else setLiveChatText(t);
                }}
                onConfusion={handleConfusion}
                size="sm"
                color="#FFFFFF"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(chatInput)}
                placeholder="INPUT DATA SIGNAL..."
                className="flex-1 bg-black border border-zinc-900 px-5 py-4 text-xs text-white placeholder-zinc-800 outline-none focus:border-white transition-all uppercase tracking-widest"
              />
              <button onClick={() => sendMessage(chatInput)}
                className="w-12 h-12 bg-white flex items-center justify-center text-black">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
