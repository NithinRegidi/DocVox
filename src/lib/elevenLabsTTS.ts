/**
 * ElevenLabs Text-to-Speech Service
 * High-quality, natural-sounding voices with multilingual support
 * 
 * Features:
 * - Premium voice quality
 * - Multiple languages including Hindi, Telugu, Tamil
 * - Emotional expression
 * - Fast response times
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// ElevenLabs Voice IDs - Multilingual voices
export const ELEVENLABS_VOICES = {
  // Multilingual voices (support Indian languages)
  'Rachel': { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'multilingual', gender: 'female' },
  'Domi': { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', language: 'multilingual', gender: 'female' },
  'Bella': { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', language: 'multilingual', gender: 'female' },
  'Antoni': { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', language: 'multilingual', gender: 'male' },
  'Josh': { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', language: 'multilingual', gender: 'male' },
  'Arnold': { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', language: 'multilingual', gender: 'male' },
  'Adam': { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', language: 'multilingual', gender: 'male' },
  'Sam': { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', language: 'multilingual', gender: 'male' },
};

// Language to model mapping
const LANGUAGE_MODELS: Record<string, string> = {
  'en': 'eleven_turbo_v2',      // Fast English
  'hi': 'eleven_multilingual_v2', // Hindi
  'te': 'eleven_multilingual_v2', // Telugu  
  'ta': 'eleven_multilingual_v2', // Tamil
  'kn': 'eleven_multilingual_v2', // Kannada
  'ml': 'eleven_multilingual_v2', // Malayalam
  'bn': 'eleven_multilingual_v2', // Bengali
  'gu': 'eleven_multilingual_v2', // Gujarati
  'mr': 'eleven_multilingual_v2', // Marathi
  'pa': 'eleven_multilingual_v2', // Punjabi
  'es': 'eleven_multilingual_v2', // Spanish
  'fr': 'eleven_multilingual_v2', // French
  'de': 'eleven_multilingual_v2', // German
  'default': 'eleven_multilingual_v2',
};

export interface ElevenLabsOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;      // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
  style?: number;          // 0-1, default 0 (only for v2)
  useSpeakerBoost?: boolean;
}

class ElevenLabsTTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private selectedVoice: string = 'Rachel';
  private isPaused: boolean = false;

  /**
   * Check if ElevenLabs is available
   */
  isAvailable(): boolean {
    return !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;
  }

  /**
   * Get all available voices
   */
  getVoices() {
    return Object.entries(ELEVENLABS_VOICES).map(([key, voice]) => ({
      key,
      ...voice,
    }));
  }

  /**
   * Set the current voice
   */
  setVoice(voiceName: string): void {
    if (ELEVENLABS_VOICES[voiceName as keyof typeof ELEVENLABS_VOICES]) {
      this.selectedVoice = voiceName;
      console.log('🎤 ElevenLabs voice set to:', voiceName);
    }
  }

  /**
   * Get the model ID for a language
   */
  private getModelForLanguage(langCode: string): string {
    const baseLang = langCode.split('-')[0].toLowerCase();
    return LANGUAGE_MODELS[baseLang] || LANGUAGE_MODELS['default'];
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async speak(text: string, langCode: string = 'en-US', options: ElevenLabsOptions = {}): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Stop any current playback
    this.stop();

    const voiceData = ELEVENLABS_VOICES[this.selectedVoice as keyof typeof ELEVENLABS_VOICES] 
      || ELEVENLABS_VOICES['Rachel'];
    const voiceId = options.voiceId || voiceData.id;
    const modelId = options.modelId || this.getModelForLanguage(langCode);

    console.log(`🗣️ ElevenLabs Speaking in ${langCode} with voice ${this.selectedVoice}, model ${modelId}`);

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text.substring(0, 5000), // ElevenLabs limit
            model_id: modelId,
            voice_settings: {
              stability: options.stability ?? 0.5,
              similarity_boost: options.similarityBoost ?? 0.75,
              style: options.style ?? 0.5,
              use_speaker_boost: options.useSpeakerBoost ?? true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('❌ ElevenLabs Error:', error);
        throw new Error(error.detail?.message || error.detail || 'ElevenLabs API error');
      }

      // Convert response to audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isPaused = false;
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isPaused = false;
          reject(new Error('Failed to play audio'));
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('❌ ElevenLabs Error:', error);
      throw error;
    }
  }

  /**
   * Speak document analysis
   */
  async speakAnalysis(analysis: {
    documentType?: string;
    summary?: string;
    explanation?: string;
    speakableSummary?: string;
    warnings?: string[];
    suggestedActions?: string[];
  }, langCode: string = 'en-US'): Promise<void> {
    let textToSpeak = '';

    if (analysis.speakableSummary) {
      textToSpeak = analysis.speakableSummary;
    } else {
      const parts: string[] = [];

      if (analysis.documentType) {
        parts.push(`This is a ${analysis.documentType}.`);
      }

      if (analysis.explanation) {
        parts.push(analysis.explanation);
      } else if (analysis.summary) {
        parts.push(analysis.summary);
      }

      if (analysis.warnings && analysis.warnings.length > 0) {
        parts.push(`Important warnings: ${analysis.warnings.slice(0, 2).join('. ')}`);
      }

      if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
        parts.push(`What you should do: ${analysis.suggestedActions.slice(0, 2).join('. ')}`);
      }

      textToSpeak = parts.join(' ');
    }

    return this.speak(textToSpeak, langCode);
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.currentAudio && !this.isPaused) {
      this.currentAudio.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.currentAudio && this.isPaused) {
      this.currentAudio.play();
      this.isPaused = false;
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPaused = false;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.currentAudio !== null && !this.isPaused;
  }

  /**
   * Check if paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }
}

// Singleton instance
export const elevenLabsTTS = new ElevenLabsTTSService();

// React Hook
import { useState, useEffect, useCallback } from 'react';

export function useElevenLabsTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedVoice, setSelectedVoiceState] = useState('Rachel');

  useEffect(() => {
    setIsAvailable(elevenLabsTTS.isAvailable());

    const interval = setInterval(() => {
      setIsSpeaking(elevenLabsTTS.isSpeaking());
      setIsPaused(elevenLabsTTS.isPausedState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const setVoice = useCallback((voiceName: string) => {
    setSelectedVoiceState(voiceName);
    elevenLabsTTS.setVoice(voiceName);
  }, []);

  const speak = useCallback(async (text: string, langCode?: string) => {
    setIsSpeaking(true);
    try {
      await elevenLabsTTS.speak(text, langCode);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const speakAnalysis = useCallback(async (
    analysis: Parameters<typeof elevenLabsTTS.speakAnalysis>[0],
    langCode?: string
  ) => {
    setIsSpeaking(true);
    try {
      await elevenLabsTTS.speakAnalysis(analysis, langCode);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    elevenLabsTTS.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    elevenLabsTTS.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    elevenLabsTTS.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return {
    speak,
    speakAnalysis,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isAvailable,
    selectedVoice,
    setVoice,
    voices: elevenLabsTTS.getVoices(),
  };
}
