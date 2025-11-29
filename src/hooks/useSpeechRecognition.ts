/**
 * Speech Recognition Hook
 * Uses browser's Web Speech API for voice input
 * Supports multiple languages including Indian regional languages
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: (options?: SpeechRecognitionOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  selectedLanguage: string;
  setLanguage: (lang: string) => void;
  availableLanguages: LanguageOption[];
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// Supported languages for Speech Recognition
export const STT_LANGUAGES: LanguageOption[] = [
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
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', flag: '🇮🇳' },
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

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Check for browser support
const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined = 
  (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor })
    .SpeechRecognition || 
  (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSupported = !!SpeechRecognitionAPI;

  // Initialize recognition
  useEffect(() => {
    if (!isSupported || !SpeechRecognitionAPI) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('🎤 Speech recognition error:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('No microphone found. Please check your microphone.');
          break;
        case 'not-allowed':
          setError('Microphone permission denied. Please allow microphone access.');
          break;
        case 'network':
          setError('Network error. Please check your internet connection.');
          break;
        case 'aborted':
          // User aborted, no need to show error
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported]);

  const startListening = useCallback((options?: SpeechRecognitionOptions) => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    // Reset
    setTranscript('');
    setInterimTranscript('');
    setError(null);

    // Configure
    const recognition = recognitionRef.current;
    recognition.lang = options?.language || selectedLanguage;
    recognition.continuous = options?.continuous ?? false;
    recognition.interimResults = options?.interimResults ?? true;

    console.log('🎤 Starting speech recognition with language:', recognition.lang);

    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      // May already be running, try to restart
      recognition.abort();
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e2) {
          setError('Could not start speech recognition');
        }
      }, 100);
    }
  }, [isSupported, selectedLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setSelectedLanguage(lang);
    console.log('🌐 Speech recognition language set to:', lang);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    selectedLanguage,
    setLanguage,
    availableLanguages: STT_LANGUAGES,
  };
}

export default useSpeechRecognition;
