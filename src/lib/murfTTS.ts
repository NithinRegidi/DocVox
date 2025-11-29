// Murf AI Text-to-Speech Service
// High-quality voices for Indian and International languages
// https://murf.ai/
// Using Falcon model with streaming API

export interface MurfVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  locale: string;
}

// Murf AI supported languages with voice IDs
// Using Falcon model voices - these are the actual voice names from Murf API
// Format: voiceId can be just the name (e.g., "natalie") or full ID (e.g., "en-US-natalie")
export const MURF_LANGUAGES: Record<string, { name: string; voices: MurfVoice[] }> = {
  'te-IN': {
    name: 'Telugu',
    voices: [
      { id: 'sanjana', name: 'Sanjana', language: 'te-IN', gender: 'female', locale: 'te-IN' },
      { id: 'suresh', name: 'Suresh', language: 'te-IN', gender: 'male', locale: 'te-IN' },
    ]
  },
  'hi-IN': {
    name: 'Hindi',
    voices: [
      { id: 'ananya', name: 'Ananya', language: 'hi-IN', gender: 'female', locale: 'hi-IN' },
      { id: 'arjun', name: 'Arjun', language: 'hi-IN', gender: 'male', locale: 'hi-IN' },
      { id: 'neha', name: 'Neha', language: 'hi-IN', gender: 'female', locale: 'hi-IN' },
    ]
  },
  'ta-IN': {
    name: 'Tamil',
    voices: [
      { id: 'kavitha', name: 'Kavitha', language: 'ta-IN', gender: 'female', locale: 'ta-IN' },
      { id: 'kumar', name: 'Kumar', language: 'ta-IN', gender: 'male', locale: 'ta-IN' },
    ]
  },
  'kn-IN': {
    name: 'Kannada',
    voices: [
      { id: 'shreya', name: 'Shreya', language: 'kn-IN', gender: 'female', locale: 'kn-IN' },
      { id: 'ravi', name: 'Ravi', language: 'kn-IN', gender: 'male', locale: 'kn-IN' },
    ]
  },
  'ml-IN': {
    name: 'Malayalam',
    voices: [
      { id: 'priya', name: 'Priya', language: 'ml-IN', gender: 'female', locale: 'ml-IN' },
      { id: 'mohan', name: 'Mohan', language: 'ml-IN', gender: 'male', locale: 'ml-IN' },
    ]
  },
  'bn-IN': {
    name: 'Bengali',
    voices: [
      { id: 'tanushree', name: 'Tanushree', language: 'bn-IN', gender: 'female', locale: 'bn-IN' },
      { id: 'anirban', name: 'Anirban', language: 'bn-IN', gender: 'male', locale: 'bn-IN' },
    ]
  },
  'gu-IN': {
    name: 'Gujarati',
    voices: [
      { id: 'mira', name: 'Mira', language: 'gu-IN', gender: 'female', locale: 'gu-IN' },
      { id: 'jay', name: 'Jay', language: 'gu-IN', gender: 'male', locale: 'gu-IN' },
    ]
  },
  'mr-IN': {
    name: 'Marathi',
    voices: [
      { id: 'sakshi', name: 'Sakshi', language: 'mr-IN', gender: 'female', locale: 'mr-IN' },
      { id: 'rahul', name: 'Rahul', language: 'mr-IN', gender: 'male', locale: 'mr-IN' },
    ]
  },
  'en-IN': {
    name: 'English (India)',
    voices: [
      { id: 'ira', name: 'Ira', language: 'en-IN', gender: 'female', locale: 'en-IN' },
      { id: 'neil', name: 'Neil', language: 'en-IN', gender: 'male', locale: 'en-IN' },
      { id: 'aarav', name: 'Aarav', language: 'en-IN', gender: 'male', locale: 'en-IN' },
    ]
  },
  'en-US': {
    name: 'English (US)',
    voices: [
      { id: 'natalie', name: 'Natalie', language: 'en-US', gender: 'female', locale: 'en-US' },
      { id: 'matthew', name: 'Matthew', language: 'en-US', gender: 'male', locale: 'en-US' },
      { id: 'sarah', name: 'Sarah', language: 'en-US', gender: 'female', locale: 'en-US' },
      { id: 'james', name: 'James', language: 'en-US', gender: 'male', locale: 'en-US' },
    ]
  },
};

// Map language codes to Murf format
const LANG_CODE_MAP: Record<string, string> = {
  'te': 'te-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'bn': 'bn-IN',
  'gu': 'gu-IN',
  'mr': 'mr-IN',
  'en': 'en-US',
  'te-IN': 'te-IN',
  'hi-IN': 'hi-IN',
  'ta-IN': 'ta-IN',
  'kn-IN': 'kn-IN',
  'ml-IN': 'ml-IN',
  'bn-IN': 'bn-IN',
  'gu-IN': 'gu-IN',
  'mr-IN': 'mr-IN',
  'en-IN': 'en-IN',
  'en-US': 'en-US',
};

class MurfTTSService {
  private apiKey: string;
  // Use India region for lower latency with Indian languages
  private baseUrl = 'https://in.api.murf.ai/v1/speech/stream';
  private globalUrl = 'https://global.api.murf.ai/v1/speech/stream';
  private currentAudio: HTMLAudioElement | null = null;
  private speaking = false;
  private paused = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_MURF_API_KEY || '';
    if (this.apiKey) {
      console.log('🎤 Murf AI TTS initialized - High-quality Indian voices!');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  supportsLanguage(langCode: string): boolean {
    const normalizedCode = LANG_CODE_MAP[langCode] || LANG_CODE_MAP[langCode.split('-')[0]];
    return !!normalizedCode && !!MURF_LANGUAGES[normalizedCode];
  }

  private getMurfLangCode(langCode: string): string {
    return LANG_CODE_MAP[langCode] || LANG_CODE_MAP[langCode.split('-')[0]] || 'en-US';
  }

  async speak(text: string, langCode: string = 'en-US', voiceId?: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Murf API key not configured');
    }

    this.stop();
    this.speaking = true;

    const murfLang = this.getMurfLangCode(langCode);
    const voices = MURF_LANGUAGES[murfLang]?.voices || [];
    const selectedVoice = voiceId || voices[0]?.id || 'natalie';

    console.log(`🎤 Murf TTS: Speaking in ${murfLang} with voice ${selectedVoice}`);

    const chunks = this.chunkText(text, 1000);

    for (const chunk of chunks) {
      if (!this.speaking) {
        break;
      }
      await this.speakChunk(chunk, murfLang, selectedVoice);
    }
    
    this.speaking = false;
  }

  private async speakChunk(text: string, langCode: string, voiceId: string): Promise<void> {
    try {
      // Use India endpoint for Indian languages, global for others
      const isIndianLanguage = langCode.endsWith('-IN') && langCode !== 'en-IN';
      const endpoint = isIndianLanguage ? this.baseUrl : this.globalUrl;
      
      const requestBody = {
        text: text,
        voiceId: voiceId,
        model: 'FALCON',
        multiNativeLocale: langCode,
        format: 'MP3',
        channelType: 'MONO',
        sampleRate: 24000,
      };
      
      console.log('🎤 Murf API Request:', { 
        text: text.substring(0, 50) + '...', 
        voiceId,
        langCode,
        endpoint 
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎤 Murf API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Murf TTS API error:', response.status, errorText);
        throw new Error(`Murf TTS failed: ${response.status} - ${errorText}`);
      }

      // Streaming API returns audio data directly
      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('No audio returned from Murf API');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🎤 Playing audio from Murf...', { blobSize: audioBlob.size });
      await this.playAudio(audioUrl);
    } catch (error) {
      console.error('🎤 Murf TTS error:', error);
      throw error;
    }
  }

  private playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };

      this.currentAudio.play().catch((err) => {
        URL.revokeObjectURL(audioUrl);
        reject(err);
      });
    });
  }

  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?।])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length <= maxLength) {
        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        if (sentence.length > maxLength) {
          const words = sentence.split(' ');
          currentChunk = '';
          for (const word of words) {
            if ((currentChunk + ' ' + word).length <= maxLength) {
              currentChunk = currentChunk ? currentChunk + ' ' + word : word;
            } else {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = word;
            }
          }
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  stop(): void {
    this.speaking = false;
    this.paused = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  pause(): void {
    if (this.currentAudio && this.speaking) {
      this.currentAudio.pause();
      this.paused = true;
    }
  }

  resume(): void {
    if (this.currentAudio && this.paused) {
      this.currentAudio.play();
      this.paused = false;
    }
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  isPausedState(): boolean {
    return this.paused;
  }

  getVoicesForLanguage(langCode: string): MurfVoice[] {
    const murfLang = this.getMurfLangCode(langCode);
    return MURF_LANGUAGES[murfLang]?.voices || [];
  }

  getSupportedLanguages(): string[] {
    return Object.keys(MURF_LANGUAGES);
  }
}

// Create singleton instance
const murfTTSInstance = new MurfTTSService();

// Export the service with bound methods
export const murfTTS = {
  speak: murfTTSInstance.speak.bind(murfTTSInstance),
  stop: murfTTSInstance.stop.bind(murfTTSInstance),
  pause: murfTTSInstance.pause.bind(murfTTSInstance),
  resume: murfTTSInstance.resume.bind(murfTTSInstance),
  isAvailable: murfTTSInstance.isAvailable.bind(murfTTSInstance),
  isSpeaking: murfTTSInstance.isSpeaking.bind(murfTTSInstance),
  isPausedState: murfTTSInstance.isPausedState.bind(murfTTSInstance),
  supportsLanguage: murfTTSInstance.supportsLanguage.bind(murfTTSInstance),
  getVoicesForLanguage: murfTTSInstance.getVoicesForLanguage.bind(murfTTSInstance),
  getSupportedLanguages: murfTTSInstance.getSupportedLanguages.bind(murfTTSInstance),
};

export default murfTTS;
