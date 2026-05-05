import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { startSTT, stopSTT } from '../voiceService';

interface Props {
  isListening: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
  onConfusion?: () => void;
  color?: string;
  size?: 'sm' | 'lg';
}

export default function VoiceController({ isListening, onTranscript, onConfusion, color = '#FFFFFF', size = 'lg' }: Props) {
  const [volume, setVolume] = useState(0);
  const confusionTimer = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyzer = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const isActuallyListening = useRef(false);

  // Real Audio Metering
  useEffect(() => {
    if (isListening) {
      const initAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyzer.current = audioContext.current.createAnalyser();
          const source = audioContext.current.createMediaStreamSource(stream);
          source.connect(analyzer.current);
          analyzer.current.fftSize = 64;
          
          const bufferLength = analyzer.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const updateVolume = () => {
            if (!analyzer.current) return;
            analyzer.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / bufferLength;
            setVolume(avg / 128); // Normalize 0-1
            animationFrame.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        } catch (err) {
          console.error("Audio meter failed:", err);
        }
      };
      initAudio();
    } else {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audioContext.current) audioContext.current.close();
      setVolume(0);
    }
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audioContext.current) audioContext.current.close();
    };
  }, [isListening]);

  const [restartKey, setRestartKey] = useState(0);

  // STT Lifecycle
  useEffect(() => {
    if (isListening && !isActuallyListening.current) {
      const success = startSTT(
        (text, isFinal) => {
          onTranscript(text, isFinal);
          if (confusionTimer.current) clearTimeout(confusionTimer.current);
          confusionTimer.current = setTimeout(() => {
            if (isActuallyListening.current && onConfusion) onConfusion();
          }, 5000);
        },
        () => {
          isActuallyListening.current = false;
          // If the browser stopped the mic but we still want to listen, trigger a restart
          setRestartKey(prev => prev + 1);
        }
      );
      if (success) isActuallyListening.current = true;
    } else if (!isListening && isActuallyListening.current) {
      stopSTT();
      isActuallyListening.current = false;
      if (confusionTimer.current) clearTimeout(confusionTimer.current);
    }
  }, [isListening, onTranscript, onConfusion, restartKey]);

  const orbSize = size === 'lg' ? 120 : 60;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Real Reactive Glow */}
        <motion.div 
          animate={{ 
            scale: isListening ? 1 + volume * 1.5 : 1,
            opacity: isListening ? 0.1 + volume * 0.4 : 0 
          }}
          className="absolute inset-0 rounded-full blur-3xl bg-white"
        />
        
        {/* The Neural Orb */}
        <motion.div 
          className={`neural-orb ${isListening ? 'orb-active' : ''}`}
          animate={{ 
            scale: isListening ? 1 + volume * 0.2 : 1,
            boxShadow: isListening ? `0 0 ${20 + volume * 100}px rgba(255,255,255,${0.1 + volume * 0.5})` : 'none'
          }}
          style={{ width: orbSize, height: orbSize }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {isListening ? (
              <div className="flex items-end gap-1 h-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.div 
                    key={i}
                    className="w-1 bg-black"
                    animate={{ height: isListening ? [8, 8 + volume * 30, 8] : 8 }}
                    transition={{ duration: 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
            ) : (
              <Mic size={size === 'lg' ? 32 : 16} className="text-zinc-400" />
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isListening && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white animate-pulse">
              Signal Sync: {volume > 0.1 ? "Receiving" : "Waiting"}
            </p>
            {volume < 0.05 && (
              <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Speak louder if signal is weak</p>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
