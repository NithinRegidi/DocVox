/**
 * Browser Text-to-Speech Service
 * Free, works offline, supports multiple languages including Indian languages
 */

export interface BrowserVoice {
  name: string;
  lang: string;
  localService: boolean;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// Supported languages for TTS
export const TTS_LANGUAGES: LanguageOption[] = [
  // English variants
  { code: 'en-US', name: 'English (US)', nativeName: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', flag: '🇬🇧' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', flag: '🇮🇳' },
  // Indian Languages
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  // International
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

class BrowserTTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedLanguage: string = 'en-IN';
  private isPaused: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;

  constructor() {
    this.loadVoices();
    // Voices may load asynchronously
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    if ('speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      this.voicesLoaded = this.voices.length > 0;
      console.log('🔊 Browser TTS voices loaded:', this.voices.length);
    }
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get all available languages
   */
  getLanguages(): LanguageOption[] {
    return TTS_LANGUAGES;
  }

  /**
   * Get available browser voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.voicesLoaded) {
      this.loadVoices();
    }
    return this.voices;
  }

  /**
   * Get voices for a specific language
   */
  getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
    const baseLang = langCode.split('-')[0];
    return this.voices.filter(v => 
      v.lang === langCode || 
      v.lang.startsWith(baseLang)
    );
  }

  /**
   * Set the current language
   */
  setLanguage(langCode: string): void {
    this.selectedLanguage = langCode;
    console.log('🌐 Browser TTS Language set to:', langCode);
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.selectedLanguage;
  }

  /**
   * Check if a voice is available for the given language
   */
  hasVoiceForLanguage(langCode: string): boolean {
    const baseLang = langCode.split('-')[0];
    return this.voices.some(v => 
      v.lang.toLowerCase() === langCode.toLowerCase() ||
      v.lang.toLowerCase().startsWith(baseLang.toLowerCase()) ||
      v.lang.toLowerCase().includes(baseLang.toLowerCase())
    );
  }

  /**
   * Get the best available voice for a language, or fall back to English
   */
  getBestVoice(langCode: string): { voice: SpeechSynthesisVoice | null; fallbackToEnglish: boolean } {
    const baseLang = langCode.split('-')[0];
    
    // Try exact match
    let voice = this.voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
    if (voice) return { voice, fallbackToEnglish: false };
    
    // Try base language match
    voice = this.voices.find(v => v.lang.toLowerCase().startsWith(baseLang.toLowerCase()));
    if (voice) return { voice, fallbackToEnglish: false };
    
    // Try contains match
    voice = this.voices.find(v => v.lang.toLowerCase().includes(baseLang.toLowerCase()));
    if (voice) return { voice, fallbackToEnglish: false };
    
    // Fall back to English
    const englishVoice = this.voices.find(v => 
      v.lang.startsWith('en-') || v.lang === 'en'
    ) || this.voices[0];
    
    return { voice: englishVoice, fallbackToEnglish: true };
  }

  /**
   * Speak text using browser's Web Speech API
   */
  async speak(text: string, langCode?: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Browser does not support speech synthesis');
    }

    // Stop any current speech
    this.stop();

    // Ensure voices are loaded
    if (!this.voicesLoaded || this.voices.length === 0) {
      this.loadVoices();
      // Wait a bit for voices to load
      await new Promise(resolve => setTimeout(resolve, 100));
      this.loadVoices();
    }

    const language = langCode || this.selectedLanguage;
    console.log('🗣️ Browser TTS Speaking in:', language);
    console.log('📢 Available voices:', this.voices.map(v => `${v.name} (${v.lang})`));

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Get the best available voice
      const { voice: matchingVoice, fallbackToEnglish } = this.getBestVoice(language);
      
      if (fallbackToEnglish) {
        console.warn(`⚠️ No voice available for ${language}. Using English voice.`);
        console.warn(`💡 To add ${language} voice: Go to Windows Settings > Time & Language > Speech > Add voices`);
        utterance.lang = matchingVoice?.lang || 'en-US';
      } else {
        utterance.lang = language;
      }

      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utterance.volume = 1;

      if (matchingVoice) {
        utterance.voice = matchingVoice;
        console.log('🎤 Using voice:', matchingVoice.name, '(', matchingVoice.lang, ')');
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        this.isPaused = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.isPaused = false;
        // Don't reject on interrupted/canceled - that's normal when stopping
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('❌ TTS Error:', event.error);
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        } else {
          resolve();
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Speak document analysis
   */
  async speakAnalysis(analysis: {
    documentType?: string;
    summary?: string;
    explanation?: string;
    keyInformation?: string[];
    suggestedActions?: string[];
    warnings?: string[];
    speakableSummary?: string;
  }, langCode?: string): Promise<void> {
    // Use speakableSummary if available
    if (analysis.speakableSummary) {
      return this.speak(analysis.speakableSummary, langCode);
    }

    // Construct speech from parts
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
    return this.speak(fullText, langCode);
  }

  /**
   * Pause playback
   */
  pause(): void {
    if ('speechSynthesis' in window && !this.isPaused) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if ('speechSynthesis' in window && this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.isPaused = false;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return 'speechSynthesis' in window && window.speechSynthesis.speaking && !this.isPaused;
  }

  /**
   * Check if paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }
}

// Singleton instance
export const browserTTS = new BrowserTTSService();

// React Hook
import { useState, useEffect, useCallback } from 'react';

export function useBrowserTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedLanguage, setSelectedLanguageState] = useState('en-IN');
  const [availableLanguages] = useState<LanguageOption[]>(TTS_LANGUAGES);

  useEffect(() => {
    setIsAvailable(browserTTS.isAvailable());

    // Update state periodically
    const interval = setInterval(() => {
      setIsSpeaking(browserTTS.isSpeaking());
      setIsPaused(browserTTS.isPausedState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const setLanguage = useCallback((langCode: string) => {
    setSelectedLanguageState(langCode);
    browserTTS.setLanguage(langCode);
  }, []);

  const speak = useCallback(async (text: string, langCode?: string) => {
    setIsSpeaking(true);
    try {
      await browserTTS.speak(text, langCode || selectedLanguage);
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedLanguage]);

  const speakAnalysis = useCallback(async (
    analysis: Parameters<typeof browserTTS.speakAnalysis>[0],
    langCode?: string
  ) => {
    setIsSpeaking(true);
    try {
      await browserTTS.speakAnalysis(analysis, langCode || selectedLanguage);
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedLanguage]);

  const pause = useCallback(() => {
    browserTTS.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    browserTTS.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    browserTTS.stop();
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
    selectedLanguage,
    setLanguage,
    availableLanguages,
    getVoices: () => browserTTS.getVoices(),
    getVoicesForLanguage: (lang: string) => browserTTS.getVoicesForLanguage(lang),
  };
}

export default browserTTS;
