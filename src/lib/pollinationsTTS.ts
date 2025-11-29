/**
 * Pollinations.AI Text-to-Speech Service
 * FREE TTS with no API key required!
 * Supports multiple voices and works globally
 * 
 * API: https://text.pollinations.ai/{text}?model=openai-audio&voice={voice}
 */

// Available voices from Pollinations.AI
export const POLLINATIONS_VOICES = {
  alloy: { name: 'Alloy', description: 'Neutral, professional' },
  echo: { name: 'Echo', description: 'Deep, resonant' },
  fable: { name: 'Fable', description: 'Storyteller vibe' },
  onyx: { name: 'Onyx', description: 'Warm, rich' },
  nova: { name: 'Nova', description: 'Bright, friendly' },
  shimmer: { name: 'Shimmer', description: 'Soft, melodic' },
} as const;

export type PollinationsVoice = keyof typeof POLLINATIONS_VOICES;

class PollinationsTTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isPaused: boolean = false;
  private selectedVoice: PollinationsVoice = 'nova';

  /**
   * Check if service is available (always true - no API key needed!)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Set the voice to use
   */
  setVoice(voice: PollinationsVoice): void {
    this.selectedVoice = voice;
    console.log('🎤 Pollinations voice set to:', voice);
  }

  /**
   * Get available voices
   */
  getVoices(): typeof POLLINATIONS_VOICES {
    return POLLINATIONS_VOICES;
  }

  /**
   * Split text into chunks (Pollinations has URL length limits)
   */
  private splitTextIntoChunks(text: string, maxLength: number = 500): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?।])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // If single sentence is too long, split by words
        if (sentence.length > maxLength) {
          const words = sentence.split(' ');
          currentChunk = '';
          for (const word of words) {
            if (currentChunk.length + word.length <= maxLength) {
              currentChunk += (currentChunk ? ' ' : '') + word;
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = word;
            }
          }
        } else {
          currentChunk = sentence;
        }
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  }

  /**
   * Speak text using Pollinations.AI TTS
   * Note: Best results with English text, but can handle transliterated text
   */
  async speak(text: string, voice?: PollinationsVoice): Promise<void> {
    this.stop();

    const voiceToUse = voice || this.selectedVoice;
    const chunks = this.splitTextIntoChunks(text, 500);

    console.log(`🌸 Pollinations TTS Speaking with voice: ${voiceToUse}`);
    console.log(`📝 Text (first 100 chars): ${text.substring(0, 100)}...`);
    console.log(`📦 Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      // Check if paused
      if (this.isPaused) {
        await new Promise<void>(resolve => {
          const checkPause = setInterval(() => {
            if (!this.isPaused) {
              clearInterval(checkPause);
              resolve();
            }
          }, 100);
        });
      }

      const chunk = chunks[i];
      const encodedText = encodeURIComponent(chunk);
      const url = `https://text.pollinations.ai/${encodedText}?model=openai-audio&voice=${voiceToUse}`;

      console.log(`🔊 Playing chunk ${i + 1}/${chunks.length}`);

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        this.currentAudio = audio;

        audio.onloadeddata = () => {
          console.log(`✅ Chunk ${i + 1} loaded`);
        };

        audio.onended = () => {
          console.log(`✅ Chunk ${i + 1} finished`);
          resolve();
        };

        audio.onerror = (e) => {
          console.error(`❌ Pollinations TTS error on chunk ${i + 1}:`, e);
          // Don't reject, continue to next chunk
          resolve();
        };

        audio.play().catch(err => {
          console.error('❌ Pollinations TTS play error:', err);
          // Try to continue anyway
          resolve();
        });
      });
    }

    this.currentAudio = null;
    console.log('✅ Pollinations TTS finished all chunks');
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.currentAudio && !this.isPaused) {
      this.currentAudio.pause();
      this.isPaused = true;
      console.log('⏸️ Pollinations TTS paused');
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.currentAudio && this.isPaused) {
      this.currentAudio.play();
      this.isPaused = false;
      console.log('▶️ Pollinations TTS resumed');
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
    console.log('⏹️ Pollinations TTS stopped');
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
export const pollinationsTTS = new PollinationsTTSService();

// React Hook
import { useState, useCallback } from 'react';

export function usePollinationsTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<PollinationsVoice>('nova');

  const speak = useCallback(async (text: string, voice?: PollinationsVoice) => {
    setIsSpeaking(true);
    try {
      await pollinationsTTS.speak(text, voice || selectedVoice);
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedVoice]);

  const pause = useCallback(() => {
    pollinationsTTS.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    pollinationsTTS.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    pollinationsTTS.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const setVoice = useCallback((voice: PollinationsVoice) => {
    setSelectedVoice(voice);
    pollinationsTTS.setVoice(voice);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    selectedVoice,
    setVoice,
    voices: POLLINATIONS_VOICES,
    isAvailable: true, // Always available!
  };
}
