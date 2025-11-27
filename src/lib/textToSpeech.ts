// Text-to-Speech utility using Web Speech API
// Supports multiple languages including Indian regional languages

export interface SpeechOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null;
  lang?: string;      // Language code (e.g., 'hi-IN', 'ta-IN')
}

// Supported languages with display names
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', flag: '🇬🇧' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

class TextToSpeechManager {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPaused: boolean = false;
  private selectedLanguage: string = 'en-US';
  private voicesLoaded: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
    // Load voices when they become available
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.voicesLoaded = true;
      };
    }
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
   * Get voices for a specific language
   */
  getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
    const voices = this.getVoices();
    // Match language code (e.g., 'hi-IN' or just 'hi')
    const langPrefix = langCode.split('-')[0];
    return voices.filter(voice => 
      voice.lang === langCode || 
      voice.lang.startsWith(langPrefix + '-') ||
      voice.lang === langPrefix
    );
  }

  /**
   * Get available languages (that have voices)
   */
  getAvailableLanguages(): LanguageOption[] {
    const voices = this.getVoices();
    return SUPPORTED_LANGUAGES.filter(lang => {
      const langPrefix = lang.code.split('-')[0];
      return voices.some(voice => 
        voice.lang === lang.code || 
        voice.lang.startsWith(langPrefix + '-') ||
        voice.lang === langPrefix
      );
    });
  }

  /**
   * Set the current language
   */
  setLanguage(langCode: string): void {
    this.selectedLanguage = langCode;
  }

  /**
   * Get the current language
   */
  getLanguage(): string {
    return this.selectedLanguage;
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
      
      // Determine language to use
      const langToUse = options.lang || this.selectedLanguage;
      
      // Log the selected language for debugging
      console.log('🗣️ TTS Language Selected:', langToUse);
      console.log('🗣️ Available voices for this language:', this.getVoicesForLanguage(langToUse).map(v => v.name));
      
      // Set the language on the utterance FIRST
      utterance.lang = langToUse;
      
      // Set voice based on language
      if (options.voice) {
        utterance.voice = options.voice;
        console.log('🗣️ Using provided voice:', options.voice.name);
      } else {
        // Find a voice for the selected language
        const allVoices = this.getVoices();
        const langVoices = this.getVoicesForLanguage(langToUse);
        
        if (langVoices.length > 0) {
          // Prefer local voices over remote ones, then prefer Google/Microsoft voices
          const preferredVoice = langVoices.find(v => v.localService && (v.name.includes('Google') || v.name.includes('Microsoft')))
            || langVoices.find(v => v.localService)
            || langVoices.find(v => v.name.includes('Google') || v.name.includes('Microsoft'))
            || langVoices[0];
          utterance.voice = preferredVoice;
          console.log('🗣️ Using voice:', preferredVoice.name, 'for language:', langToUse);
        } else {
          console.log('⚠️ No voice found for language:', langToUse, '- browser will use default');
          console.log('📋 All available voices:', allVoices.map(v => `${v.name} (${v.lang})`));
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
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    setIsSupported(tts.isSupported());
    
    // Always show all supported languages
    // The browser will try to find a voice for the selected language
    setAvailableLanguages(SUPPORTED_LANGUAGES);
    
    // Load voices
    const loadVoices = () => {
      const voices = tts.getVoices();
      if (voices.length > 0) {
        setVoicesReady(true);
      }
    };

    // Voices might not be loaded immediately
    loadVoices();
    
    // Also listen for voices changed event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Retry loading voices after a delay (some browsers need this)
    const timeout = setTimeout(loadVoices, 500);
    
    // Update state periodically while speaking
    const interval = setInterval(() => {
      setIsSpeaking(tts.isSpeaking());
      setIsPaused(tts.isPausedState());
    }, 100);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const setLanguage = useCallback((langCode: string) => {
    console.log('🌐 Language changed to:', langCode);
    setSelectedLanguage(langCode);
    tts.setLanguage(langCode);
  }, []);

  const speak = useCallback(async (text: string, options?: SpeechOptions) => {
    setIsSpeaking(true);
    try {
      await tts.speak(text, { ...options, lang: options?.lang || selectedLanguage });
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedLanguage]);

  const speakAnalysis = useCallback(async (analysis: Parameters<typeof tts.speakAnalysis>[0], options?: SpeechOptions) => {
    setIsSpeaking(true);
    try {
      await tts.speakAnalysis(analysis, { ...options, lang: options?.lang || selectedLanguage });
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedLanguage]);

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
    selectedLanguage,
    setLanguage,
    availableLanguages,
    voicesReady,
  };
}
