import { VoiceRecorder } from 'capacitor-voice-recorder';

export type STTCallback = (transcript: string, isFinal: boolean) => void;

let isRecording = false;
let autoStopTimer: NodeJS.Timeout | null = null;
let currentOnResult: STTCallback | null = null;
let currentOnEnd: (() => void) | null = null;

export async function requestMicPermission(): Promise<boolean> {
  const result = await VoiceRecorder.requestAudioRecordingPermission();
  return !!result.value;
}

// Debug State for UI feedback
export let voiceDebugState = {
  status: "idle",
  fileSize: 0,
  lastTranscript: "",
  error: ""
};

const BACKEND_URL = "http://localhost:8000"; // Adjust if needed

// Helper to interact with Backend Transcription API
async function transcribeAudioBase64(base64Data: string, mimeType: string): Promise<string> {
  voiceDebugState.status = "transcribing";
  
  // Convert base64 to Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  console.log(`[ORBI VOICE] Audio file size: ${blob.size} bytes`);
  voiceDebugState.fileSize = blob.size;

  if (blob.size === 0) {
    console.error("[ORBI VOICE] Recording failed. Audio file size is 0.");
    voiceDebugState.error = "File size 0";
    return "";
  }

  const formData = new FormData();
  formData.append('file', blob, 'recording.aac');

  try {
    console.log("[ORBI VOICE] Sending audio to backend...");
    const res = await fetch(`${BACKEND_URL}/voice/transcribe`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) throw new Error(`Backend Error ${res.status}`);
    const data = await res.json();
    console.log("[ORBI VOICE] Transcript received:", data.transcript);
    voiceDebugState.lastTranscript = data.transcript;
    voiceDebugState.status = "idle";
    return data.transcript.trim();
  } catch (err: any) {
    console.error("[ORBI VOICE] Transcription error:", err);
    voiceDebugState.error = err.message;
    voiceDebugState.status = "error";
    return "";
  }
}

export async function startSTT(onResult: STTCallback, onEnd: () => void): Promise<boolean> {
  if (isRecording) return true;
  
  console.log("[ORBI VOICE] Mic button pressed. Checking permissions...");
  voiceDebugState.status = "requesting_mic";
  voiceDebugState.error = "";

  currentOnResult = onResult;
  currentOnEnd = onEnd;

  try {
    const hasPerm = await VoiceRecorder.hasAudioRecordingPermission();
    if (!hasPerm.value) {
      console.log("[ORBI VOICE] Requesting native audio permission...");
      const req = await VoiceRecorder.requestAudioRecordingPermission();
      if (!req.value) {
        throw new Error("Permission Denied by User");
      }
    }

    console.log("[ORBI VOICE] Start recording called...");
    const startResult = await VoiceRecorder.startRecording();
    
    if (startResult.value) {
      console.log("[ORBI VOICE] Recording started successfully. Green mic indicator should be active.");
      voiceDebugState.status = "recording";
      isRecording = true;

      if (autoStopTimer) clearTimeout(autoStopTimer);
      autoStopTimer = setTimeout(() => {
        if (isRecording) {
          console.log("[ORBI VOICE] Auto-stopping recording to prevent infinite waiting state.");
          stopSTT();
        }
      }, 5000); // 5 seconds max recording
      
      return true;
    } else {
      throw new Error("Plugin failed to start recording.");
    }
  } catch (e: any) {
    console.error("[ORBI VOICE] Recording failed", e);
    voiceDebugState.error = e.message || "Unknown error";
    voiceDebugState.status = "error";
    if (currentOnEnd) currentOnEnd();
    return false;
  }
}

export async function stopSTT(): Promise<void> {
  if (!isRecording) return;
  
  console.log("[ORBI VOICE] Stopping recording...");
  if (autoStopTimer) clearTimeout(autoStopTimer);
  isRecording = false;

  try {
    const result = await VoiceRecorder.stopRecording();
    console.log("[ORBI VOICE] Recording stopped.");
    
    if (result.value && result.value.recordDataBase64) {
      if (currentOnResult && currentOnEnd) {
        const text = await transcribeAudioBase64(result.value.recordDataBase64, result.value.mimeType);
        if (text) currentOnResult(text, true);
        else currentOnResult("", false);
        currentOnEnd();
      }
    } else {
      console.warn("[ORBI VOICE] Recording stopped but no audio data was returned.");
      if (currentOnEnd) currentOnEnd();
    }
  } catch (e: any) {
    console.error("[ORBI VOICE] Error stopping recording:", e);
    if (currentOnEnd) currentOnEnd();
  }
}

// Backend TTS Integration
let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string, options?: { voice?: string; onEnd?: () => void }): Promise<void> {
  stopSpeaking();
  
  try {
    const response = await fetch(`${BACKEND_URL}/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        voice: options?.voice || "en-US-ChristopherNeural"
      })
    });

    if (!response.ok) throw new Error("TTS failed");
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    currentAudio = new Audio(url);
    if (options?.onEnd) currentAudio.onended = options.onEnd;
    
    console.log("[ORBI VOICE] Playing AI response...");
    await currentAudio.play();
  } catch (err) {
    console.error("TTS Error:", err);
    // Fallback to browser TTS if backend fails
    const utterance = new SpeechSynthesisUtterance(text);
    if (options?.onEnd) utterance.onend = options.onEnd;
    window.speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
}

export function isSpeechSupported(): boolean {
  return true;
}
