/**
 * Alternative TTS Service using ResponsiveVoice (Free for non-commercial)
 * or fallback to improved browser TTS
 * Supports Indian languages including Telugu, Hindi, Tamil, etc.
 */

// Declare ResponsiveVoice on window
declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice: string, options?: Record<string, unknown>) => void;
      cancel: () => void;
      pause: () => void;
      resume: () => void;
      isPlaying: () => boolean;
      getVoices: () => { name: string }[];
    };
  }
}

// Language codes and their ResponsiveVoice voice names
export const GOOGLE_TTS_LANGUAGES: Record<string, { code: string; voice: string }> = {
  'en': { code: 'en', voice: 'UK English Female' },
  'en-US': { code: 'en', voice: 'US English Female' },
  'en-IN': { code: 'en', voice: 'UK English Female' },
  'en-GB': { code: 'en', voice: 'UK English Female' },
  'hi': { code: 'hi', voice: 'Hindi Female' },
  'hi-IN': { code: 'hi', voice: 'Hindi Female' },
  'te': { code: 'te', voice: 'Telugu Female' },
  'te-IN': { code: 'te', voice: 'Telugu Female' },
  'ta': { code: 'ta', voice: 'Tamil Female' },
  'ta-IN': { code: 'ta', voice: 'Tamil Female' },
  'kn': { code: 'kn', voice: 'Kannada Female' },
  'kn-IN': { code: 'kn', voice: 'Kannada Female' },
  'ml': { code: 'ml', voice: 'Malayalam Female' },
  'ml-IN': { code: 'ml', voice: 'Malayalam Female' },
  'bn': { code: 'bn', voice: 'Bengali Female' },
  'bn-IN': { code: 'bn', voice: 'Bengali Female' },
  'gu': { code: 'gu', voice: 'Gujarati Female' },
  'gu-IN': { code: 'gu', voice: 'Gujarati Female' },
  'mr': { code: 'mr', voice: 'Marathi Female' },
  'mr-IN': { code: 'mr', voice: 'Marathi Female' },
  'pa': { code: 'pa', voice: 'Punjabi Female' },
  'pa-IN': { code: 'pa', voice: 'Punjabi Female' },
  'es': { code: 'es', voice: 'Spanish Female' },
  'es-ES': { code: 'es', voice: 'Spanish Female' },
  'fr': { code: 'fr', voice: 'French Female' },
  'fr-FR': { code: 'fr', voice: 'French Female' },
  'de': { code: 'de', voice: 'German Female' },
  'de-DE': { code: 'de', voice: 'German Female' },
  'ja': { code: 'ja', voice: 'Japanese Female' },
  'ja-JP': { code: 'ja', voice: 'Japanese Female' },
  'ko': { code: 'ko', voice: 'Korean Female' },
  'ko-KR': { code: 'ko', voice: 'Korean Female' },
  'zh': { code: 'zh-CN', voice: 'Chinese Female' },
  'zh-CN': { code: 'zh-CN', voice: 'Chinese Female' },
  'ar': { code: 'ar', voice: 'Arabic Female' },
  'ar-SA': { code: 'ar', voice: 'Arabic Female' },
  'pt': { code: 'pt', voice: 'Portuguese Female' },
  'pt-BR': { code: 'pt', voice: 'Brazilian Portuguese Female' },
  'ru': { code: 'ru', voice: 'Russian Female' },
  'ru-RU': { code: 'ru', voice: 'Russian Female' },
};

class GoogleTTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isPaused: boolean = false;
  private responsiveVoiceLoaded: boolean = false;
  private loadingPromise: Promise<boolean> | null = null;

  constructor() {
    // Auto-load ResponsiveVoice on construction
    this.loadResponsiveVoice();
  }

  /**
   * Load ResponsiveVoice library dynamically
   */
  private loadResponsiveVoice(): Promise<boolean> {
    if (this.loadingPromise) return this.loadingPromise;
    
    this.loadingPromise = new Promise((resolve) => {
      // Check if already loaded
      if (window.responsiveVoice) {
        this.responsiveVoiceLoaded = true;
        console.log('✅ ResponsiveVoice already loaded');
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE';
      script.async = true;
      
      script.onload = () => {
        // Wait a bit for ResponsiveVoice to initialize
        setTimeout(() => {
          this.responsiveVoiceLoaded = !!window.responsiveVoice;
          if (this.responsiveVoiceLoaded) {
            console.log('✅ ResponsiveVoice loaded successfully');
            // List available voices
            const rv = window.responsiveVoice;
            if (rv && rv.getVoices) {
              const voices = rv.getVoices();
              console.log('🎤 ResponsiveVoice voices:', voices.map((v) => v.name));
            }
          }
          resolve(this.responsiveVoiceLoaded);
        }, 500);
      };
      
      script.onerror = () => {
        console.warn('⚠️ Failed to load ResponsiveVoice');
        this.responsiveVoiceLoaded = false;
        resolve(false);
      };
      
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Get the voice name for a language
   */
  private getVoiceName(langCode: string): string {
    const lang = GOOGLE_TTS_LANGUAGES[langCode] || GOOGLE_TTS_LANGUAGES[langCode.split('-')[0]];
    return lang?.voice || 'UK English Female';
  }

  /**
   * Check if Google TTS supports the given language
   * Returns true for supported languages (especially Indian languages)
   */
  isAvailable(langCode?: string): boolean {
    if (!langCode) return true;
    const baseLang = langCode.split('-')[0];
    return langCode in GOOGLE_TTS_LANGUAGES || baseLang in GOOGLE_TTS_LANGUAGES;
  }

  /**
   * Speak text using ResponsiveVoice
   */
  async speak(text: string, langCode: string = 'en'): Promise<void> {
    this.stop();

    // Ensure ResponsiveVoice is loaded
    await this.loadResponsiveVoice();

    const voiceName = this.getVoiceName(langCode);
    console.log(`🗣️ ResponsiveVoice Speaking with voice: ${voiceName}`);
    console.log(`📝 Text (first 100 chars): ${text.substring(0, 100)}...`);

    const rv = window.responsiveVoice;
    
    if (!rv) {
      console.error('❌ ResponsiveVoice not available');
      throw new Error('ResponsiveVoice not loaded');
    }

    return new Promise((resolve, reject) => {
      try {
        rv.speak(text, voiceName, {
          pitch: 1,
          rate: 0.9,
          volume: 1,
          onstart: () => {
            console.log('🔊 ResponsiveVoice started speaking');
          },
          onend: () => {
            console.log('✅ ResponsiveVoice finished speaking');
            resolve();
          },
          onerror: (err: unknown) => {
            console.error('❌ ResponsiveVoice error:', err);
            reject(new Error('ResponsiveVoice TTS failed'));
          }
        });
      } catch (error) {
        console.error('❌ ResponsiveVoice speak error:', error);
        reject(error);
      }
    });
  }

  /**
   * Pause playback
   */
  pause(): void {
    const rv = window.responsiveVoice;
    if (rv) {
      rv.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    const rv = window.responsiveVoice;
    if (rv) {
      rv.resume();
      this.isPaused = false;
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    const rv = window.responsiveVoice;
    if (rv) {
      rv.cancel();
    }
    this.isPaused = false;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    const rv = window.responsiveVoice;
    return rv ? rv.isPlaying() : false;
  }

  /**
   * Check if paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }
}

export const googleTTS = new GoogleTTSService();
