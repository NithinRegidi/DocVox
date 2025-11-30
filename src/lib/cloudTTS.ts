// Cloud Text-to-Speech using Google Cloud TTS API
// Supports high-quality voices for Indian languages

export interface CloudVoice {
  languageCode: string;
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  displayName: string;
}

export interface CloudLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  voices: CloudVoice[];
}

// Google Cloud TTS supported languages with Indian language focus
export const CLOUD_LANGUAGES: CloudLanguageOption[] = [
  // English variants
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    flag: '🇺🇸',
    voices: [
      { languageCode: 'en-US', name: 'en-US-Neural2-A', ssmlGender: 'MALE', displayName: 'US Male' },
      { languageCode: 'en-US', name: 'en-US-Neural2-C', ssmlGender: 'FEMALE', displayName: 'US Female' },
    ]
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    nativeName: 'English',
    flag: '🇬🇧',
    voices: [
      { languageCode: 'en-GB', name: 'en-GB-Neural2-A', ssmlGender: 'FEMALE', displayName: 'UK Female' },
      { languageCode: 'en-GB', name: 'en-GB-Neural2-B', ssmlGender: 'MALE', displayName: 'UK Male' },
    ]
  },
  {
    code: 'en-IN',
    name: 'English (India)',
    nativeName: 'English',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'en-IN', name: 'en-IN-Neural2-A', ssmlGender: 'FEMALE', displayName: 'Indian Female' },
      { languageCode: 'en-IN', name: 'en-IN-Neural2-B', ssmlGender: 'MALE', displayName: 'Indian Male' },
    ]
  },
  // Indian Languages
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE', displayName: 'Hindi Female' },
      { languageCode: 'hi-IN', name: 'hi-IN-Neural2-B', ssmlGender: 'MALE', displayName: 'Hindi Male' },
    ]
  },
  {
    code: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'ta-IN', name: 'ta-IN-Neural2-A', ssmlGender: 'FEMALE', displayName: 'Tamil Female' },
      { languageCode: 'ta-IN', name: 'ta-IN-Neural2-B', ssmlGender: 'MALE', displayName: 'Tamil Male' },
    ]
  },
  {
    code: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'te-IN', name: 'te-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Telugu Female' },
      { languageCode: 'te-IN', name: 'te-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Telugu Male' },
    ]
  },
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'kn-IN', name: 'kn-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Kannada Female' },
      { languageCode: 'kn-IN', name: 'kn-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Kannada Male' },
    ]
  },
  {
    code: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'ml-IN', name: 'ml-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Malayalam Female' },
      { languageCode: 'ml-IN', name: 'ml-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Malayalam Male' },
    ]
  },
  {
    code: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'mr-IN', name: 'mr-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Marathi Female' },
      { languageCode: 'mr-IN', name: 'mr-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Marathi Male' },
    ]
  },
  {
    code: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'gu-IN', name: 'gu-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Gujarati Female' },
      { languageCode: 'gu-IN', name: 'gu-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Gujarati Male' },
    ]
  },
  {
    code: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'bn-IN', name: 'bn-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Bengali Female' },
      { languageCode: 'bn-IN', name: 'bn-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Bengali Male' },
    ]
  },
  {
    code: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    voices: [
      { languageCode: 'pa-IN', name: 'pa-IN-Standard-A', ssmlGender: 'FEMALE', displayName: 'Punjabi Female' },
      { languageCode: 'pa-IN', name: 'pa-IN-Standard-B', ssmlGender: 'MALE', displayName: 'Punjabi Male' },
    ]
  },
  // International languages
  {
    code: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    voices: [
      { languageCode: 'es-ES', name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE', displayName: 'Spanish Female' },
      { languageCode: 'es-ES', name: 'es-ES-Neural2-B', ssmlGender: 'MALE', displayName: 'Spanish Male' },
    ]
  },
  {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    voices: [
      { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A', ssmlGender: 'FEMALE', displayName: 'French Female' },
      { languageCode: 'fr-FR', name: 'fr-FR-Neural2-B', ssmlGender: 'MALE', displayName: 'French Male' },
    ]
  },
  {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    voices: [
      { languageCode: 'de-DE', name: 'de-DE-Neural2-A', ssmlGender: 'FEMALE', displayName: 'German Female' },
      { languageCode: 'de-DE', name: 'de-DE-Neural2-B', ssmlGender: 'MALE', displayName: 'German Male' },
    ]
  },
  {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    voices: [
      { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B', ssmlGender: 'FEMALE', displayName: 'Japanese Female' },
      { languageCode: 'ja-JP', name: 'ja-JP-Neural2-C', ssmlGender: 'MALE', displayName: 'Japanese Male' },
    ]
  },
  {
    code: 'zh-CN',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    voices: [
      { languageCode: 'cmn-CN', name: 'cmn-CN-Neural2-A', ssmlGender: 'FEMALE', displayName: 'Chinese Female' },
      { languageCode: 'cmn-CN', name: 'cmn-CN-Neural2-B', ssmlGender: 'MALE', displayName: 'Chinese Male' },
    ]
  },
  {
    code: 'ar-XA',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    voices: [
      { languageCode: 'ar-XA', name: 'ar-XA-Standard-A', ssmlGender: 'FEMALE', displayName: 'Arabic Female' },
      { languageCode: 'ar-XA', name: 'ar-XA-Standard-B', ssmlGender: 'MALE', displayName: 'Arabic Male' },
    ]
  },
];

export interface CloudTTSOptions {
  languageCode?: string;
  voiceName?: string;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number;  // 0.25 to 4.0, default 1.0
  pitch?: number;         // -20.0 to 20.0, default 0
  volumeGainDb?: number;  // -96.0 to 16.0, default 0
}

class CloudTTSManager {
  private apiKey: string;
  private currentAudio: HTMLAudioElement | null = null;
  private selectedLanguage: string = 'en-US';
  private selectedVoice: string = '';
  private isPaused: boolean = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_API || '';
    if (!this.apiKey) {
      console.warn('⚠️ Google API key not found. Cloud TTS will not work.');
    }
  }

  /**
   * Check if Cloud TTS is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get all supported languages
   */
  getLanguages(): CloudLanguageOption[] {
    return CLOUD_LANGUAGES;
  }

  /**
   * Get voices for a specific language
   */
  getVoicesForLanguage(langCode: string): CloudVoice[] {
    const lang = CLOUD_LANGUAGES.find(l => l.code === langCode);
    return lang?.voices || [];
  }

  /**
   * Set the current language
   */
  setLanguage(langCode: string): void {
    this.selectedLanguage = langCode;
    // Auto-select first voice for this language
    const voices = this.getVoicesForLanguage(langCode);
    if (voices.length > 0) {
      this.selectedVoice = voices[0].name;
    }
    console.log('🌐 Cloud TTS Language set to:', langCode);
  }

  /**
   * Set the current voice
   */
  setVoice(voiceName: string): void {
    this.selectedVoice = voiceName;
    console.log('🎤 Cloud TTS Voice set to:', voiceName);
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.selectedLanguage;
  }

  /**
   * Synthesize text to speech using Google Cloud TTS API
   */
  async speak(text: string, options: CloudTTSOptions = {}): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Google API key not configured');
    }

    // Stop any current playback
    this.stop();

    const langCode = options.languageCode || this.selectedLanguage;
    const voices = this.getVoicesForLanguage(langCode);
    const voiceName = options.voiceName || this.selectedVoice || (voices[0]?.name || '');
    const voice = voices.find(v => v.name === voiceName) || voices[0];

    if (!voice) {
      throw new Error(`No voice available for language: ${langCode}`);
    }

    console.log('🗣️ Cloud TTS Speaking in:', langCode, 'with voice:', voice.name);

    const requestBody = {
      input: { text },
      voice: {
        languageCode: voice.languageCode,
        name: voice.name,
        ssmlGender: options.ssmlGender || voice.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options.speakingRate ?? 1.0,
        pitch: options.pitch ?? 0,
        volumeGainDb: options.volumeGainDb ?? 0,
      },
    };

    try {
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
        const error = await response.json();
        console.error('❌ Cloud TTS Error:', error);
        throw new Error(error.error?.message || 'Failed to synthesize speech');
      }

      const data = await response.json();
      const audioContent = data.audioContent;

      // Convert base64 to audio and play
      return new Promise((resolve, reject) => {
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          this.isPaused = false;
          resolve();
        };

        audio.onerror = (e) => {
          this.currentAudio = null;
          this.isPaused = false;
          reject(new Error('Failed to play audio'));
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('❌ Cloud TTS Error:', error);
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
    keyInformation?: string[];
    suggestedActions?: string[];
    warnings?: string[];
    speakableSummary?: string;
  }, options: CloudTTSOptions = {}): Promise<void> {
    // Use speakableSummary if available
    if (analysis.speakableSummary) {
      return this.speak(analysis.speakableSummary, options);
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
    return this.speak(fullText, options);
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
export const cloudTTS = new CloudTTSManager();

// React Hook - Uses Google Cloud TTS (Indian languages) → ElevenLabs → Pollinations → Browser TTS fallback
import { useState, useEffect, useCallback } from 'react';
import { browserTTS, TTS_LANGUAGES } from './browserTTS';
import { elevenLabsTTS } from './elevenLabsTTS';
import { googleTTS, GOOGLE_TTS_LANGUAGES } from './googleTTS';
import { pollinationsTTS } from './pollinationsTTS';
import { googleCloudTTS } from './googleCloudTTS';
import { sarvamTTS } from './sarvamTTS';
import { murfTTS } from './murfTTS';

export function useCloudTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedLanguage, setSelectedLanguageState] = useState('en-IN');
  const [selectedVoice, setSelectedVoiceState] = useState('');
  const [availableLanguages] = useState<CloudLanguageOption[]>(CLOUD_LANGUAGES);
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'browser'>('elevenlabs');

  useEffect(() => {
    // Check which TTS services are available
    const elevenLabsAvailable = elevenLabsTTS.isAvailable();
    const browserAvailable = browserTTS.isAvailable();
    
    // Google Cloud TTS is the best for Indian languages!
    const googleCloudAvailable = googleCloudTTS.isAvailable();
    const sarvamAvailable = sarvamTTS.isAvailable();
    const murfAvailable = murfTTS.isAvailable();
    setIsAvailable(true);
    setTtsProvider(elevenLabsAvailable ? 'elevenlabs' : 'browser');
    
    console.log('🔊 TTS Providers available:');
    console.log('  - 🇮🇳 Sarvam AI (Indian languages):', sarvamAvailable ? '✅ YES' : '❌ NO');
    console.log('  - 🎤 Murf AI (Premium voices):', murfAvailable ? '✅ YES' : '❌ NO');
    console.log('  - Google Cloud TTS (Indian languages):', googleCloudAvailable ? '✅ YES' : '❌ NO');
    console.log('  - ElevenLabs:', elevenLabsAvailable ? '✅ YES' : '❌ NO');
    console.log('  - Pollinations.AI: ✅ YES (always available)');
    console.log('  - Browser TTS:', browserAvailable ? '✅ YES' : '❌ NO');
    
    // Update state periodically
    const interval = setInterval(() => {
      setIsSpeaking(sarvamTTS.isSpeaking() || murfTTS.isSpeaking() || googleCloudTTS.isSpeaking() || elevenLabsTTS.isSpeaking() || pollinationsTTS.isSpeaking() || googleTTS.isSpeaking() || browserTTS.isSpeaking() || cloudTTS.isSpeaking());
      setIsPaused(sarvamTTS.isPausedState() || murfTTS.isPausedState() || googleCloudTTS.isPausedState() || elevenLabsTTS.isPausedState() || pollinationsTTS.isPausedState() || browserTTS.isPausedState() || cloudTTS.isPausedState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const setLanguage = useCallback((langCode: string) => {
    setSelectedLanguageState(langCode);
    browserTTS.setLanguage(langCode);
    cloudTTS.setLanguage(langCode);
  }, []);

  const setVoice = useCallback((voiceName: string) => {
    setSelectedVoiceState(voiceName);
    cloudTTS.setVoice(voiceName);
  }, []);

  // Primary speak function - Sarvam AI (Indian languages) → Google Cloud TTS → ElevenLabs → Pollinations → Browser TTS
  const speak = useCallback(async (text: string, options?: CloudTTSOptions) => {
    setIsSpeaking(true);
    const langCode = options?.languageCode || selectedLanguage;
    const baseLang = langCode.split('-')[0];

    // Check if this is an Indian language
    const indianLanguages = ['te', 'hi', 'ta', 'kn', 'ml', 'bn', 'gu', 'mr', 'pa', 'or'];
    const isIndianLanguage = indianLanguages.includes(baseLang);

    console.log(`🗣️ Speaking in ${langCode}, Indian language: ${isIndianLanguage}`);

    try {
      // FIRST: Try Sarvam AI for Indian languages (BEST for Telugu, Hindi, Tamil!)
      if (isIndianLanguage && sarvamTTS.isAvailable() && sarvamTTS.supportsLanguage(langCode)) {
        try {
          console.log('🇮🇳 Using Sarvam AI TTS (Native Indian voices - Made in India!)');
          await sarvamTTS.speak(text, langCode);
          return;
        } catch (sarvamError) {
          console.warn('Sarvam AI TTS failed:', sarvamError);
        }
      }

      // SECOND: Try Murf AI for high-quality voices
      if (murfTTS.isAvailable() && murfTTS.supportsLanguage(langCode)) {
        try {
          console.log('🎤 Using Murf AI TTS (Premium quality voices!)');
          await murfTTS.speak(text, langCode);
          return;
        } catch (murfError) {
          console.warn('Murf AI TTS failed:', murfError);
        }
      }

      try {
        // THIRD: Try Google Cloud TTS for Indian languages
        if (isIndianLanguage && googleCloudTTS.isAvailable() && googleCloudTTS.supportsLanguage(langCode)) {
          console.log('☁️ Using Google Cloud TTS (Fallback for Indian languages)');
          await googleCloudTTS.speak(text, langCode);
          return;
        }
      } catch (googleCloudError) {
        console.warn('Google Cloud TTS failed:', googleCloudError);
      }

      try {
        // Try ElevenLabs (premium quality)
        if (elevenLabsTTS.isAvailable()) {
          console.log('🎤 Using ElevenLabs TTS (Premium)');
          await elevenLabsTTS.speak(text, langCode);
          return;
        }
      } catch (elevenLabsError) {
        console.warn('ElevenLabs TTS failed:', elevenLabsError);
      }
      
      try {
        // Try Pollinations.AI TTS (FREE, works for English)
        if (!isIndianLanguage) {
          console.log('🌸 Using Pollinations.AI TTS (FREE - No API Key!)');
          await pollinationsTTS.speak(text);
          return;
        }
      } catch (pollinationsError) {
        console.warn('Pollinations TTS failed:', pollinationsError);
      }
      
      // Final fallback to browser TTS - always available
      try {
        console.log('🔊 Using Browser TTS (Free, supports Indian languages)');
        await browserTTS.speak(text, langCode);
        return;
      } catch (browserError) {
        console.error('Browser TTS failed:', browserError);
      }
      
      // If all else fails, throw error
      throw new Error('All TTS providers failed. Please check your internet connection or browser settings.');
    } catch (error) {
      console.error('TTS error:', error);
      // Last resort - try browser TTS one more time
      try {
        console.log('🔊 Final attempt: Browser TTS');
        await browserTTS.speak(text, langCode);
      } catch {
        throw new Error('Text-to-speech is not available. Please check your browser settings.');
      }
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedLanguage]);

  // Speak analysis - ElevenLabs → Browser TTS fallback
  const speakAnalysis = useCallback(async (
    analysis: Parameters<typeof cloudTTS.speakAnalysis>[0], 
    options?: CloudTTSOptions
  ) => {
    setIsSpeaking(true);
    const langCode = options?.languageCode || selectedLanguage;
    
    // Construct text from analysis
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
        parts.push(`Important warnings: ${analysis.warnings.join('. ')}`);
      }
      
      if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
        parts.push(`Here's what you should do: ${analysis.suggestedActions.slice(0, 3).map((action, i) => `${i + 1}. ${action}`).join('. ')}`);
      }
      
      textToSpeak = parts.join(' ');
    }

    // Check if this is an Indian language - use Sarvam AI for best quality!
    const baseLang = langCode.split('-')[0];
    const isIndianLanguage = ['te', 'hi', 'ta', 'kn', 'ml', 'bn', 'gu', 'mr', 'pa', 'or'].includes(baseLang);

    try {
      // FIRST: Try Sarvam AI for Indian languages (BEST for Telugu, Hindi, Tamil!)
      if (isIndianLanguage && sarvamTTS.isAvailable() && sarvamTTS.supportsLanguage(langCode)) {
        try {
          console.log('🇮🇳 Using Sarvam AI TTS for analysis (Native Indian voices!)');
          await sarvamTTS.speak(textToSpeak, langCode);
          return;
        } catch (sarvamError) {
          console.warn('Sarvam AI TTS failed for analysis:', sarvamError);
        }
      }

      // SECOND: Try Murf AI for high-quality voices
      if (murfTTS.isAvailable() && murfTTS.supportsLanguage(langCode)) {
        try {
          console.log('🎤 Using Murf AI TTS for analysis (Premium quality!)');
          await murfTTS.speak(textToSpeak, langCode);
          return;
        } catch (murfError) {
          console.warn('Murf AI TTS failed for analysis:', murfError);
        }
      }

      // THIRD: Try Google Cloud TTS for Indian languages
      if (isIndianLanguage && googleCloudTTS.isAvailable()) {
        try {
          console.log('☁️ Using Google Cloud TTS for analysis (Fallback)');
          await googleCloudTTS.speak(textToSpeak, langCode);
          return;
        } catch (googleCloudError) {
          console.warn('Google Cloud TTS failed for analysis:', googleCloudError);
        }
      }

      try {
        // Try ElevenLabs (premium quality)
        if (elevenLabsTTS.isAvailable()) {
          console.log('🎤 Using ElevenLabs TTS for analysis (Premium)');
          await elevenLabsTTS.speak(textToSpeak, langCode);
          return;
        }
      } catch (elevenLabsError) {
        console.warn('ElevenLabs TTS failed for analysis, trying Pollinations.AI:', elevenLabsError);
      }
      
      try {
        // Try Pollinations.AI TTS (FREE, no API key!)
        console.log('🌸 Using Pollinations.AI TTS for analysis (FREE)');
        await pollinationsTTS.speak(textToSpeak);
        return;
      } catch (pollinationsError) {
        console.warn('Pollinations TTS failed for analysis, trying Google TTS:', pollinationsError);
      }
      
      try {
        // Try Google Translate TTS (great for Indian languages)
        if (googleTTS.isAvailable(langCode)) {
          console.log('🌐 Using Google Translate TTS for analysis (Free, Indian languages)');
          await googleTTS.speak(textToSpeak, langCode);
          return;
        }
      } catch (googleError) {
        console.warn('Google TTS failed for analysis, falling back to browser:', googleError);
      }
      
      // Fallback to browser TTS
      console.log('🔊 Using Browser TTS for analysis (Free)');
      await browserTTS.speak(textToSpeak, langCode);
    } catch (browserError) {
      console.error('All TTS methods failed:', browserError);
      throw new Error('Text-to-speech is not available. Please check your browser settings.');
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedLanguage]);

  const pause = useCallback(() => {
    sarvamTTS.pause();
    murfTTS.pause();
    googleCloudTTS.pause();
    elevenLabsTTS.pause();
    pollinationsTTS.pause();
    browserTTS.pause();
    cloudTTS.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    sarvamTTS.resume();
    murfTTS.resume();
    googleCloudTTS.resume();
    elevenLabsTTS.resume();
    pollinationsTTS.resume();
    browserTTS.resume();
    cloudTTS.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    sarvamTTS.stop();
    murfTTS.stop();
    googleCloudTTS.stop();
    elevenLabsTTS.stop();
    pollinationsTTS.stop();
    googleTTS.stop();
    browserTTS.stop();
    cloudTTS.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const getVoicesForLanguage = useCallback((langCode: string) => {
    return cloudTTS.getVoicesForLanguage(langCode);
  }, []);

  // Check if a voice is available for the language (now includes Sarvam AI and Murf)
  const hasVoiceForLanguage = useCallback((langCode: string) => {
    // Sarvam AI supports Indian languages (BEST!)
    if (sarvamTTS.isAvailable() && sarvamTTS.supportsLanguage(langCode)) {
      return true;
    }
    // Murf AI supports many languages
    if (murfTTS.isAvailable() && murfTTS.supportsLanguage(langCode)) {
      return true;
    }
    // Google Cloud TTS supports Indian languages
    if (googleCloudTTS.isAvailable() && googleCloudTTS.supportsLanguage(langCode)) {
      return true;
    }
    return browserTTS.hasVoiceForLanguage(langCode);
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
    selectedVoice,
    setLanguage,
    setVoice,
    availableLanguages,
    getVoicesForLanguage,
    hasVoiceForLanguage,
  };
}
