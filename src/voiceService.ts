// Speech-to-Text using Web Speech API
export type STTCallback = (transcript: string, isFinal: boolean) => void;

let recognition: any = null;

export async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Close immediately
    return true;
  } catch (err) {
    console.error("Mic permission denied:", err);
    return false;
  }
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let silenceTimer: NodeJS.Timeout | null = null;
let isRecording = false;

const SILENCE_THRESHOLD = 0.05; // Adjust based on noise
const SILENCE_DURATION = 1500; // 1.5 seconds of silence stops recording

// Helper to interact with Groq Whisper API directly from frontend
async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('model', 'whisper-large-v3-turbo');
  
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: formData
    });
    
    if (!res.ok) throw new Error("Whisper transcription failed");
    const data = await res.json();
    return data.text.trim();
  } catch (err) {
    console.error("Transcription error:", err);
    return "";
  }
}

export function startSTT(onResult: STTCallback, onEnd: () => void): boolean {
  if (isRecording) return true;
  
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    isRecording = true;
    audioChunks = [];
    
    // Set up AudioContext for silence detection
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkSilence = () => {
      if (!isRecording) return;
      analyser!.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength / 255; // Normalize 0 to 1

      if (avg < SILENCE_THRESHOLD) {
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => {
            stopSTT(); // Auto-stop after duration
          }, SILENCE_DURATION);
        }
      } else {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      }
      requestAnimationFrame(checkSilence);
    };
    
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    
    mediaRecorder.onstop = async () => {
      isRecording = false;
      stream.getTracks().forEach(t => t.stop());
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      if (blob.size > 1000) { // Ensure audio isn't completely empty
        const text = await transcribeAudio(blob);
        if (text) onResult(text, true);
      }
      onEnd();
    };
    
    mediaRecorder.start(100); // 100ms chunks
    checkSilence();
    
  }).catch(err => {
    console.error("Mic permission denied:", err);
    onEnd();
  });
  
  return true;
}

export function stopSTT(): void {
  if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// Text-to-Speech using Web Speech Synthesis
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, options?: { rate?: number; pitch?: number; volume?: number; onEnd?: () => void }): void {
  if (!window.speechSynthesis) {
    options?.onEnd?.();
    return;
  }
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Adjusted for extreme clarity and professional tone
  utterance.rate = options?.rate ?? 1.0; 
  utterance.pitch = options?.pitch ?? 1.0;
  utterance.volume = options?.volume ?? 1.0;

  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // If voices aren't loaded yet, try again after a tiny delay
    setTimeout(() => { voices = window.speechSynthesis.getVoices(); }, 100);
  }
  
  const preferred = 
    voices.find(v => v.name.includes('Natural')) ||
    voices.find(v => v.name.includes('Google US English')) ||
    voices.find(v => v.name.includes('Microsoft David')) ||
    voices.find(v => v.name.includes('Daniel')) ||
    voices.find(v => v.name.includes('Samantha')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];

  if (preferred) {
    utterance.voice = preferred;
    console.log("Using Voice Protocol:", preferred.name);
  }

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
  currentUtterance = null;
}

export function isSpeechSupported(): boolean {
  return !!(((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && window.speechSynthesis);
}
