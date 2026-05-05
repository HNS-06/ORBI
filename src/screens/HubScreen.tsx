import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, Sparkles, BookOpen, Mic, Zap, ChevronRight } from 'lucide-react';
import { Companion } from '../types';
import { chatWithCompanion } from '../aiService';
import { speak } from '../voiceService';
import VoiceController from '../components/VoiceController';
import { loadStats } from '../statsService';

interface Props {
  companion: Companion;
  userName: string;
  onStartStudy: (topic: string) => void;
  onStartRecall: (topic: string) => void;
}

const SUGGESTED = ['Quantum Physics', 'Calculus', 'Machine Learning', 'History', 'Chemistry', 'Economics'];

export default function HubScreen({ companion, userName, onStartStudy, onStartRecall }: Props) {
  const [stats] = useState(loadStats());
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [topic, setTopic] = useState('');
  const [aiResponse, setAiResponse] = useState(`${userName}, what are you going to study today?`);
  const [isThinking, setIsThinking] = useState(false);
  const accRef = useRef('');
  const hasGreeted = useRef(false);

  // Auto Greeting on Mount
  useEffect(() => {
    if (!hasGreeted.current) {
      const greeting = `${userName}, what are you going to study today?`;
      setAiResponse(greeting);
      speak(greeting);
      // Automatically start listening after greeting
      setTimeout(() => setIsListening(true), 1500);
      hasGreeted.current = true;
    }
  }, [userName]);

  // Auto Revision System
  const lastSession = stats.sessions[0];
  const needsRevision = lastSession && lastSession.status === 'completed' && 
                       (Date.now() - new Date(lastSession.date).getTime()) > 12 * 3600 * 1000;

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      accRef.current += ' ' + text;
      const full = accRef.current.trim();
      setTranscript(full);
      if (full.length > 5) {
        setTopic(full);
        handleAIResponse(full);
        setIsListening(false);
      }
    } else {
      setLiveText(text);
    }
  }, [companion.systemPrompt]);

  const handleAIResponse = useCallback(async (userText: string) => {
    setIsThinking(true);
    setAiResponse("Processing data...");
    try {
      const reply = await chatWithCompanion(
        companion.systemPrompt, 
        [], 
        `The user wants to study "${userText}" today. Acknowledge this subject naturally and ask one specific follow-up question to set the study objective.`
      );
      setAiResponse(reply);
      setIsThinking(false);
      speak(reply, { onEnd: () => setIsListening(true) });
    } catch (err) {
      const errorMsg = "Signal disrupted. Please try again.";
      setAiResponse(errorMsg);
      setIsThinking(false);
      speak(errorMsg, { onEnd: () => setIsListening(true) });
    }
  }, [companion.systemPrompt]);

  const handleConfusion = useCallback(() => {
    if (liveText || transcript) {
      const full = (transcript + ' ' + liveText).trim();
      if (full.length > 2) {
        setTopic(full);
        handleAIResponse(full);
      } else {
        setIsListening(true);
      }
      return;
    }
    
    const msgs = [
      "I'm here—take your time. What's on your mind?",
      "Thinking of where to start? Just tell me the topic.",
      "Don't worry about being perfect, just speak naturally."
    ];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    setAiResponse(msg);
    speak(msg, { onEnd: () => setIsListening(true) });
  }, [transcript, liveText, handleAIResponse]);

  const handleTopicSelect = (t: string) => {
    setTopic(t);
    setTranscript(t);
    handleAIResponse(t);
  };

  const handleReset = () => {
    setTopic('');
    setTranscript('');
    setLiveText('');
    setAiResponse(`${userName}, what are you going to study today?`);
    accRef.current = '';
  };

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-36 px-6 flex flex-col items-center max-w-2xl mx-auto space-y-10">
      
      <div className="text-center space-y-3">
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="label-geo">Protocol / Session Active</motion.span>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-5xl font-light text-white tracking-tighter uppercase">Protocol Hub</motion.h2>
      </div>

      {/* Voice Interaction Area */}
      <div className="w-full flex flex-col items-center gap-16 py-4">
        <div className="cursor-pointer" onClick={() => setIsListening(!isListening)}>
          <VoiceController 
            isListening={isListening} 
            onTranscript={handleTranscript}
            onConfusion={handleConfusion}
            color="#FFFFFF"
          />
        </div>

        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] -mt-10">
          {isListening ? "Signal Active: Speak Now" : "Signal Idle: Tap Orb to Sync"}
        </p>

        <div className="w-full space-y-8">
          <AnimatePresence mode="wait">
            {isThinking ? (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 bg-white"
                      animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="response" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="geo-panel p-8 relative border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles size={14} className="text-white" />
                  <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-zinc-500">{companion.name}</p>
                </div>
                <p className="text-lg text-white font-light leading-relaxed tracking-tight">{aiResponse}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Transcript / Live Text Area */}
          <AnimatePresence>
            {(transcript || liveText) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="border-t border-zinc-900 pt-6">
                <p className="label-geo mb-3">Neural Input Signal</p>
                <p className="text-sm text-zinc-400 font-mono leading-relaxed">
                  {transcript} <span className="text-white">{liveText}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Auto Revision Suggestion */}
      {needsRevision && !topic && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full geo-panel border-white/20 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white flex items-center justify-center text-black">
              <RefreshCw size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Revision Protocol</p>
              <p className="text-sm text-zinc-400">Recall required: <span className="text-white font-bold">{lastSession.topic}</span></p>
            </div>
          </div>
          <button onClick={() => onStartRecall(lastSession.topic)} className="btn-accent px-6 py-3">
            Execute
          </button>
        </motion.div>
      )}

      {/* Suggested Topics */}
      {!topic && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
          <p className="label-geo text-center">Suggested Cognition Vectors</p>
          <div className="flex flex-wrap justify-center gap-3">
            {SUGGESTED.map(t => (
              <button key={t} onClick={() => handleTopicSelect(t)}
                className="chip chip-inactive">
                {t}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Deploy Button */}
      <div className="flex flex-col items-center gap-10 w-full">
        <button 
          onClick={() => setIsListening(!isListening)}
          className={`w-20 h-20 flex items-center justify-center transition-all duration-300 border ${
            isListening ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-white hover:text-white'
          }`}
        >
          {isListening ? <Zap size={32} /> : <Mic size={32} />}
        </button>

        <AnimatePresence>
          {topic && (
            <motion.button 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              onClick={() => onStartStudy(topic)}
              className="btn-accent w-full h-16 flex items-center justify-center gap-4 group"
            >
              <Brain size={20} />
              <span className="text-sm font-bold uppercase tracking-widest">Deploy Session: {topic}</span>
              <ChevronRight size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <button onClick={handleReset} className="label-geo hover:text-white transition-colors flex items-center gap-2">
          <RefreshCw size={12} /> Clear System Buffer
        </button>
      </div>

      {/* Secondary info */}
      <div className="grid grid-cols-3 gap-1 w-full border-t border-zinc-900 pt-8">
        {[
          { icon: BookOpen, label: 'Cognition', val: topic ? 'LOCKED' : 'READY' },
          { icon: Mic, label: 'Signal', val: isListening ? 'ACTIVE' : 'IDLE' },
          { icon: Brain, label: 'Neural', val: 'SYNCED' },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="p-4 text-center">
            <p className="label-geo mb-1">{label}</p>
            <p className="text-xs font-bold text-white tracking-widest uppercase">{val}</p>
          </div>
        ))}
      </div>
    </motion.main>
  );
}
