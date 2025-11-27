// Text-to-Speech utility using Web Speech API

export interface SpeechOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null;
}

class TextToSpeechManager {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPaused: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  /**
   * Get English voices (preferred for document reading)
   */
  getEnglishVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter(voice => voice.lang.startsWith('en'));
  }

  /**
   * Speak the given text
   */
  speak(text: string, options: SpeechOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech synthesis is not supported in this browser'));
        return;
      }

      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      
      // Set voice (use first English voice if available)
      if (options.voice) {
        utterance.voice = options.voice;
      } else {
        const englishVoices = this.getEnglishVoices();
        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0];
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        this.isPaused = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.isPaused = false;
        reject(new Error(`Speech error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.synth.speaking && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  /**
   * Stop current speech
   */
  stop(): void {
    this.synth.cancel();
    this.currentUtterance = null;
    this.isPaused = false;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Check if currently paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Speak document analysis results
   */
  speakAnalysis(analysis: {
    documentType?: string;
    summary?: string;
    explanation?: string;
    keyInformation?: string[];
    suggestedActions?: string[];
    warnings?: string[];
    speakableSummary?: string;
  }, options: SpeechOptions = {}): Promise<void> {
    // Use speakableSummary if available (optimized for speech)
    if (analysis.speakableSummary) {
      return this.speak(analysis.speakableSummary, options);
    }

    // Fallback to constructing speech from parts
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
      parts.push(`Important warnings: ${analysis.warnings.join('. ')}`);
    }

    if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
      parts.push(`Here's what you should do: ${analysis.suggestedActions.slice(0, 3).map((action, i) => `${i + 1}. ${action}`).join('. ')}`);
    }

    const fullText = parts.join(' ');
    return this.speak(fullText, options);
  }
}

// Singleton instance
export const tts = new TextToSpeechManager();

// Hook for React components
import { useState, useEffect, useCallback } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(tts.isSupported());
    
    // Update state periodically while speaking
    const interval = setInterval(() => {
      setIsSpeaking(tts.isSpeaking());
      setIsPaused(tts.isPausedState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const speak = useCallback(async (text: string, options?: SpeechOptions) => {
    setIsSpeaking(true);
    try {
      await tts.speak(text, options);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const speakAnalysis = useCallback(async (analysis: Parameters<typeof tts.speakAnalysis>[0], options?: SpeechOptions) => {
    setIsSpeaking(true);
    try {
      await tts.speakAnalysis(analysis, options);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    tts.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    tts.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    tts.stop();
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
    isSupported,
  };
}
