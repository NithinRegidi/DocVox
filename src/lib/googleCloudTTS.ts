/**
 * Google Cloud Text-to-Speech Service
 * Supports Indian languages including Telugu, Hindi, Tamil, Kannada, Malayalam
 * 
 * FREE: 4 million characters per month!
 * 
 * To enable:
 * 1. Go to https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
 * 2. Enable "Cloud Text-to-Speech API"
 * 3. Your existing Gemini API key will work!
 */

// Language codes and their Google Cloud TTS voice names
export const GOOGLE_CLOUD_VOICES: Record<string, { languageCode: string; voiceName: string; gender: string }> = {
  // Telugu
  'te': { languageCode: 'te-IN', voiceName: 'te-IN-Standard-A', gender: 'FEMALE' },
  'te-IN': { languageCode: 'te-IN', voiceName: 'te-IN-Standard-A', gender: 'FEMALE' },
  
  // Hindi
  'hi': { languageCode: 'hi-IN', voiceName: 'hi-IN-Wavenet-A', gender: 'FEMALE' },
  'hi-IN': { languageCode: 'hi-IN', voiceName: 'hi-IN-Wavenet-A', gender: 'FEMALE' },
  
  // Tamil
  'ta': { languageCode: 'ta-IN', voiceName: 'ta-IN-Standard-A', gender: 'FEMALE' },
  'ta-IN': { languageCode: 'ta-IN', voiceName: 'ta-IN-Standard-A', gender: 'FEMALE' },
  
  // Kannada
  'kn': { languageCode: 'kn-IN', voiceName: 'kn-IN-Standard-A', gender: 'FEMALE' },
  'kn-IN': { languageCode: 'kn-IN', voiceName: 'kn-IN-Standard-A', gender: 'FEMALE' },
  
  // Malayalam
  'ml': { languageCode: 'ml-IN', voiceName: 'ml-IN-Standard-A', gender: 'FEMALE' },
  'ml-IN': { languageCode: 'ml-IN', voiceName: 'ml-IN-Standard-A', gender: 'FEMALE' },
  
  // Bengali
  'bn': { languageCode: 'bn-IN', voiceName: 'bn-IN-Standard-A', gender: 'FEMALE' },
  'bn-IN': { languageCode: 'bn-IN', voiceName: 'bn-IN-Standard-A', gender: 'FEMALE' },
  
  // Gujarati
  'gu': { languageCode: 'gu-IN', voiceName: 'gu-IN-Standard-A', gender: 'FEMALE' },
  'gu-IN': { languageCode: 'gu-IN', voiceName: 'gu-IN-Standard-A', gender: 'FEMALE' },
  
  // Marathi
  'mr': { languageCode: 'mr-IN', voiceName: 'mr-IN-Standard-A', gender: 'FEMALE' },
  'mr-IN': { languageCode: 'mr-IN', voiceName: 'mr-IN-Standard-A', gender: 'FEMALE' },
  
  // Punjabi
  'pa': { languageCode: 'pa-IN', voiceName: 'pa-IN-Standard-A', gender: 'FEMALE' },
  'pa-IN': { languageCode: 'pa-IN', voiceName: 'pa-IN-Standard-A', gender: 'FEMALE' },
  
  // English (India)
  'en': { languageCode: 'en-IN', voiceName: 'en-IN-Wavenet-A', gender: 'FEMALE' },
  'en-IN': { languageCode: 'en-IN', voiceName: 'en-IN-Wavenet-A', gender: 'FEMALE' },
  'en-US': { languageCode: 'en-US', voiceName: 'en-US-Wavenet-F', gender: 'FEMALE' },
  'en-GB': { languageCode: 'en-GB', voiceName: 'en-GB-Wavenet-A', gender: 'FEMALE' },
  
  // Other languages
  'es': { languageCode: 'es-ES', voiceName: 'es-ES-Wavenet-C', gender: 'FEMALE' },
  'es-ES': { languageCode: 'es-ES', voiceName: 'es-ES-Wavenet-C', gender: 'FEMALE' },
  'fr': { languageCode: 'fr-FR', voiceName: 'fr-FR-Wavenet-C', gender: 'FEMALE' },
  'fr-FR': { languageCode: 'fr-FR', voiceName: 'fr-FR-Wavenet-C', gender: 'FEMALE' },
  'de': { languageCode: 'de-DE', voiceName: 'de-DE-Wavenet-C', gender: 'FEMALE' },
  'de-DE': { languageCode: 'de-DE', voiceName: 'de-DE-Wavenet-C', gender: 'FEMALE' },
  'ja': { languageCode: 'ja-JP', voiceName: 'ja-JP-Wavenet-B', gender: 'FEMALE' },
  'ja-JP': { languageCode: 'ja-JP', voiceName: 'ja-JP-Wavenet-B', gender: 'FEMALE' },
  'ko': { languageCode: 'ko-KR', voiceName: 'ko-KR-Wavenet-A', gender: 'FEMALE' },
  'ko-KR': { languageCode: 'ko-KR', voiceName: 'ko-KR-Wavenet-A', gender: 'FEMALE' },
  'zh': { languageCode: 'cmn-CN', voiceName: 'cmn-CN-Wavenet-A', gender: 'FEMALE' },
  'zh-CN': { languageCode: 'cmn-CN', voiceName: 'cmn-CN-Wavenet-A', gender: 'FEMALE' },
  'ar': { languageCode: 'ar-XA', voiceName: 'ar-XA-Wavenet-A', gender: 'FEMALE' },
  'ar-SA': { languageCode: 'ar-XA', voiceName: 'ar-XA-Wavenet-A', gender: 'FEMALE' },
  'pt': { languageCode: 'pt-BR', voiceName: 'pt-BR-Wavenet-A', gender: 'FEMALE' },
  'pt-BR': { languageCode: 'pt-BR', voiceName: 'pt-BR-Wavenet-A', gender: 'FEMALE' },
  'ru': { languageCode: 'ru-RU', voiceName: 'ru-RU-Wavenet-A', gender: 'FEMALE' },
  'ru-RU': { languageCode: 'ru-RU', voiceName: 'ru-RU-Wavenet-A', gender: 'FEMALE' },
};

class GoogleCloudTTSService {
  private apiKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isPaused: boolean = false;
  private audioQueue: string[] = [];
  private isPlaying: boolean = false;

  constructor() {
    // Use the same API key as Gemini
    this.apiKey = import.meta.env.VITE_GOOGLE_API || null;
    
    if (this.apiKey) {
      console.log('✅ Google Cloud TTS API Key loaded (using Gemini key)');
    } else {
      console.warn('⚠️ No Google API key found for TTS');
    }
  }

  /**
   * Check if Google Cloud TTS is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Check if a language is supported
   */
  supportsLanguage(langCode: string): boolean {
    const baseLang = langCode.split('-')[0];
    return langCode in GOOGLE_CLOUD_VOICES || baseLang in GOOGLE_CLOUD_VOICES;
  }

  /**
   * Get voice config for a language
   */
  private getVoiceConfig(langCode: string): { languageCode: string; voiceName: string; gender: string } {
    const baseLang = langCode.split('-')[0];
    return GOOGLE_CLOUD_VOICES[langCode] || GOOGLE_CLOUD_VOICES[baseLang] || GOOGLE_CLOUD_VOICES['en-IN'];
  }

  /**
   * Split text into chunks (Google Cloud TTS has a 5000 byte limit)
   */
  private splitTextIntoChunks(text: string, maxLength: number = 4000): string[] {
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
        if (sentence.length > maxLength) {
          // Split long sentences by words
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
    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Synthesize speech using Google Cloud TTS API
   */
  private async synthesizeSpeech(text: string, langCode: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Google Cloud TTS API key not configured');
    }

    const voiceConfig = this.getVoiceConfig(langCode);
    
    const requestBody = {
      input: { text },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceConfig.voiceName,
        ssmlGender: voiceConfig.gender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,
        pitch: 0
      }
    };

    console.log(`🔊 Google Cloud TTS: Synthesizing ${langCode} with voice ${voiceConfig.voiceName}`);

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Google Cloud TTS Error:', errorData);
      
      if (response.status === 403) {
        throw new Error('Google Cloud TTS API not enabled. Please enable it at: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com');
      }
      
      throw new Error(`Google Cloud TTS failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.audioContent; // Base64 encoded audio
  }

  /**
   * Play base64 audio
   */
  private playAudio(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
      const audio = new Audio(audioSrc);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (e) => {
        this.currentAudio = null;
        console.error('❌ Audio playback error:', e);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(err => {
        console.error('❌ Audio play error:', err);
        reject(err);
      });
    });
  }

  /**
   * Speak text using Google Cloud TTS
   */
  async speak(text: string, langCode: string = 'en-IN'): Promise<void> {
    this.stop();
    this.isPlaying = true;

    const chunks = this.splitTextIntoChunks(text);
    const voiceConfig = this.getVoiceConfig(langCode);

    console.log(`🗣️ Google Cloud TTS Speaking in ${voiceConfig.languageCode}`);
    console.log(`📝 Text (first 100 chars): ${text.substring(0, 100)}...`);
    console.log(`📦 Split into ${chunks.length} chunks`);

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (!this.isPlaying) {
          console.log('⏹️ Playback stopped');
          break;
        }

        // Wait if paused
        while (this.isPaused && this.isPlaying) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!this.isPlaying) break;

        console.log(`🔊 Playing chunk ${i + 1}/${chunks.length}`);
        
        const audioContent = await this.synthesizeSpeech(chunks[i], langCode);
        await this.playAudio(audioContent);
        
        console.log(`✅ Chunk ${i + 1} finished`);
      }
    } catch (error) {
      console.error('❌ Google Cloud TTS Error:', error);
      throw error;
    } finally {
      this.isPlaying = false;
      this.currentAudio = null;
    }

    console.log('✅ Google Cloud TTS finished all chunks');
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.currentAudio && !this.isPaused) {
      this.currentAudio.pause();
      this.isPaused = true;
      console.log('⏸️ Google Cloud TTS paused');
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.currentAudio && this.isPaused) {
      this.currentAudio.play();
      this.isPaused = false;
      console.log('▶️ Google Cloud TTS resumed');
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPaused = false;
    console.log('⏹️ Google Cloud TTS stopped');
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  /**
   * Check if paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }
}

// Singleton instance
export const googleCloudTTS = new GoogleCloudTTSService();

// React Hook
import { useState, useCallback } from 'react';

export function useGoogleCloudTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const speak = useCallback(async (text: string, langCode: string = 'en-IN') => {
    setIsSpeaking(true);
    try {
      await googleCloudTTS.speak(text, langCode);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    googleCloudTTS.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    googleCloudTTS.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    googleCloudTTS.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isAvailable: googleCloudTTS.isAvailable(),
    supportsLanguage: googleCloudTTS.supportsLanguage.bind(googleCloudTTS),
  };
}
