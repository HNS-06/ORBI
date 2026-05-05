import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Brain, Star, AlertTriangle, Lightbulb, RotateCcw, BookOpen, Zap } from 'lucide-react';
import { Companion, RecallAnalysis } from '../types';
import { analyzeRecall } from '../aiService';
import { startSTT, stopSTT, speak } from '../voiceService';
import { recordSession } from '../statsService';

interface Props {
  companion: Companion;
  topic: string;
  onDone: () => void;
}

export default function RecallScreen({ companion, topic, onDone }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [liveText, setLiveText] = useState('');
  const [analysis, setAnalysis] = useState<RecallAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const accRef = useRef('');

  const toggleRecording = () => {
    if (isRecording) {
      stopSTT();
      setIsRecording(false);
      const final = (accRef.current + ' ' + liveText).trim();
      if (final) {
        setTranscript(final);
        handleAnalyze(final);
      }
    } else {
      accRef.current = '';
      setTranscript('');
      setLiveText('');
      setAnalysis(null);
      const started = startSTT(
        (t, isFinal) => { if (isFinal) accRef.current += ' ' + t; else setLiveText(t); },
        () => setIsRecording(false)
      );
      if (started) setIsRecording(true);
    }
  };

  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    const result = await analyzeRecall(topic, text);
    setAnalysis(result);
    setIsAnalyzing(false);

    // Save recall results
    recordSession({
      date: new Date().toDateString(),
      topic,
      duration: 0,
      companionId: companion.id,
      recallScore: result.score,
      status: 'completed'
    });

    speak(`Analysis complete. Your recall score is ${result.score} percent. ${result.summary}`);
  };

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-36 px-6 max-w-3xl mx-auto space-y-10">

      <div className="text-center space-y-3">
        <p className="label-geo">Phase: Active Recall</p>
        <h2 className="text-5xl font-light text-white tracking-tighter uppercase">{topic}</h2>
        <p className="text-zinc-500 text-sm tracking-tight">Explain everything you remember about this topic.</p>
      </div>

      <div className="geo-panel p-10 flex flex-col items-center gap-10">
        <div className="relative">
          <motion.div 
            animate={{ 
              scale: isRecording ? [1, 1.2, 1] : 1,
              opacity: isRecording ? [0.1, 0.4, 0.1] : 0
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-white rounded-full blur-3xl"
          />
          <button 
            onClick={toggleRecording}
            className={`w-28 h-28 border flex items-center justify-center transition-all duration-300 ${
              isRecording ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-white hover:text-white'
            }`}
          >
            {isRecording ? <MicOff size={40} /> : <Mic size={40} />}
          </button>
        </div>

        <div className="w-full space-y-4">
          <p className="label-geo text-center">Neural Output Signal</p>
          <div className="geo-panel p-6 border-zinc-900 min-h-[120px]">
            <p className="text-sm text-white font-light leading-relaxed">
              {transcript} <span className="text-zinc-500 italic">{liveText}</span>
              {!transcript && !liveText && !isAnalyzing && <span className="text-zinc-800 italic">Waiting for input signal...</span>}
              {isAnalyzing && <span className="text-white animate-pulse">Analyzing neural mapping...</span>}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="geo-panel p-10 border-white/20">
              <div className="flex flex-col md:flex-row gap-10 items-center">
                <div className="w-32 h-32 border-2 border-white flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-5xl font-light text-white">{analysis.score}</p>
                </div>
                <div className="flex-1 space-y-4">
                  <p className="label-geo">Synthesis Summary</p>
                  <p className="text-xl text-white font-light leading-snug">{analysis.summary}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="geo-panel p-6 space-y-4">
                <p className="label-geo flex items-center gap-2"><Star size={12} /> High Integrity Zones</p>
                <div className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-zinc-300 flex gap-2">
                      <span className="text-white">▪</span> {s}
                    </p>
                  ))}
                </div>
              </div>
              <div className="geo-panel p-6 space-y-4 border-white/10">
                <p className="label-geo flex items-center gap-2"><AlertTriangle size={12} /> Signal Gaps</p>
                <div className="space-y-2">
                  {analysis.gaps.map((g, i) => (
                    <p key={i} className="text-xs text-zinc-300 flex gap-2">
                      <span className="text-white">▪</span> {g}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="geo-panel p-8 space-y-6">
              <p className="label-geo">Optimization Vectors</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb size={12} /> Suggested Actions
                  </p>
                  <div className="space-y-2">
                    {analysis.tips.map((t, i) => (
                      <p key={i} className="text-xs text-white">{t}</p>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen size={12} /> Key Concepts Extracted
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((k, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-tighter">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={toggleRecording} className="btn-ghost flex-1 flex items-center justify-center gap-3">
                <RotateCcw size={16} /> Re-Execute Recall
              </button>
              <button onClick={onDone} className="btn-accent flex-1 flex items-center justify-center gap-3">
                <span>Finalize Session</span>
                <Zap size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.main>
  );
}
