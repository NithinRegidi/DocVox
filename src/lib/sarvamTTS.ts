// Sarvam AI Text-to-Speech Service
// Native Indian language TTS - Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, etc.
// https://www.sarvam.ai/

export interface SarvamVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
}

// Sarvam AI supported Indian languages with voice IDs
// IMPORTANT: Voice IDs must be LOWERCASE as per API spec
// Voices: Female - anushka, manisha, vidya, arya, priya, neha, pooja, simran, kavya, anjali, sneha, sunita, tara, kriti
// Voices: Male - abhilash, karun, hitesh, aditya, chirag, harsh, rahul, rohan, kiran, vikram, rajesh, anirudh, ishaan
export const SARVAM_LANGUAGES: Record<string, { name: string; voices: SarvamVoice[] }> = {
  'te-IN': {
    name: 'Telugu',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'te-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'te-IN', gender: 'male' },
      { id: 'priya', name: 'Priya', language: 'te-IN', gender: 'female' },
      { id: 'rahul', name: 'Rahul', language: 'te-IN', gender: 'male' },
    ]
  },
  'hi-IN': {
    name: 'Hindi',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'hi-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'hi-IN', gender: 'male' },
      { id: 'manisha', name: 'Manisha', language: 'hi-IN', gender: 'female' },
      { id: 'karun', name: 'Karun', language: 'hi-IN', gender: 'male' },
    ]
  },
  'ta-IN': {
    name: 'Tamil',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'ta-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'ta-IN', gender: 'male' },
      { id: 'vidya', name: 'Vidya', language: 'ta-IN', gender: 'female' },
      { id: 'hitesh', name: 'Hitesh', language: 'ta-IN', gender: 'male' },
    ]
  },
  'kn-IN': {
    name: 'Kannada',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'kn-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'kn-IN', gender: 'male' },
    ]
  },
  'ml-IN': {
    name: 'Malayalam',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'ml-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'ml-IN', gender: 'male' },
    ]
  },
  'bn-IN': {
    name: 'Bengali',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'bn-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'bn-IN', gender: 'male' },
    ]
  },
  'gu-IN': {
    name: 'Gujarati',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'gu-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'gu-IN', gender: 'male' },
    ]
  },
  'mr-IN': {
    name: 'Marathi',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'mr-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'mr-IN', gender: 'male' },
    ]
  },
  'pa-IN': {
    name: 'Punjabi',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'pa-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'pa-IN', gender: 'male' },
    ]
  },
  'or-IN': {
    name: 'Odia',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'or-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'or-IN', gender: 'male' },
    ]
  },
  'en-IN': {
    name: 'English (India)',
    voices: [
      { id: 'anushka', name: 'Anushka', language: 'en-IN', gender: 'female' },
      { id: 'abhilash', name: 'Abhilash', language: 'en-IN', gender: 'male' },
      { id: 'priya', name: 'Priya', language: 'en-IN', gender: 'female' },
      { id: 'rahul', name: 'Rahul', language: 'en-IN', gender: 'male' },
    ]
  },
};

// Map language codes to Sarvam format
const LANG_CODE_MAP: Record<string, string> = {
  'te': 'te-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'bn': 'bn-IN',
  'gu': 'gu-IN',
  'mr': 'mr-IN',
  'pa': 'pa-IN',
  'or': 'or-IN',
  'en': 'en-IN',
  'te-IN': 'te-IN',
  'hi-IN': 'hi-IN',
  'ta-IN': 'ta-IN',
  'kn-IN': 'kn-IN',
  'ml-IN': 'ml-IN',
  'bn-IN': 'bn-IN',
  'gu-IN': 'gu-IN',
  'mr-IN': 'mr-IN',
  'pa-IN': 'pa-IN',
  'or-IN': 'or-IN',
  'en-IN': 'en-IN',
};

class SarvamTTSService {
  private apiKey: string;
  private baseUrl = 'https://api.sarvam.ai/text-to-speech';
  private currentAudio: HTMLAudioElement | null = null;
  private speaking = false;
  private paused = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_SARVAM_API_KEY || '';
    if (this.apiKey) {
      console.log('🇮🇳 Sarvam AI TTS initialized - Native Indian language support!');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  supportsLanguage(langCode: string): boolean {
    const normalizedCode = LANG_CODE_MAP[langCode] || LANG_CODE_MAP[langCode.split('-')[0]];
    return !!normalizedCode && !!SARVAM_LANGUAGES[normalizedCode];
  }

  private getSarvamLangCode(langCode: string): string {
    return LANG_CODE_MAP[langCode] || LANG_CODE_MAP[langCode.split('-')[0]] || 'en-IN';
  }

  async speak(text: string, langCode: string = 'te-IN', voiceId?: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    this.stop();
    this.speaking = true;

    const sarvamLang = this.getSarvamLangCode(langCode);
    
    // Get voice - ensure lowercase (API requirement!)
    const voices = SARVAM_LANGUAGES[sarvamLang]?.voices || [];
    let selectedVoice = voiceId?.toLowerCase() || voices[0]?.id || 'anushka';
    
    // Ensure voice ID is lowercase
    selectedVoice = selectedVoice.toLowerCase();
    
    console.log(`🇮🇳 Sarvam TTS: Speaking in ${sarvamLang} with voice ${selectedVoice}`);

    const chunks = this.chunkText(text, 1500); // Sarvam limit is 1500 chars

    for (const chunk of chunks) {
      if (!this.speaking) {
        break;
      }
      await this.speakChunk(chunk, sarvamLang, selectedVoice);
    }

    this.speaking = false;
  }

  private async speakChunk(text: string, langCode: string, voiceId: string): Promise<void> {
    try {
      const requestBody = {
        text: text,
        target_language_code: langCode,
        speaker: voiceId.toLowerCase(), // MUST be lowercase!
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v2',
      };
      
      console.log('🇮🇳 Sarvam API Request:', { 
        text: text.substring(0, 50) + '...', 
        langCode, 
        speaker: requestBody.speaker,
        model: requestBody.model 
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🇮🇳 Sarvam API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sarvam TTS API error:', response.status, errorText);
        throw new Error(`Sarvam TTS failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🇮🇳 Sarvam API Response:', { hasAudios: !!data.audios, audioCount: data.audios?.length });

      if (!data.audios || data.audios.length === 0) {
        throw new Error('No audio returned from Sarvam API');
      }

      const audioBase64 = data.audios[0];
      const audioBlob = this.base64ToBlob(audioBase64, 'audio/wav');
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('🇮🇳 Playing audio from Sarvam...');
      await this.playAudio(audioUrl);
    } catch (error) {
      console.error('🇮🇳 Sarvam TTS error:', error);
      throw error;
    }
  }

  private playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => {
        this.speaking = false;
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      this.currentAudio.onerror = () => {
        this.speaking = false;
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };

      this.currentAudio.play().catch((err) => {
        this.speaking = false;
        URL.revokeObjectURL(audioUrl);
        reject(err);
      });
    });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
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

  getVoicesForLanguage(langCode: string): SarvamVoice[] {
    const sarvamLang = this.getSarvamLangCode(langCode);
    return SARVAM_LANGUAGES[sarvamLang]?.voices || [];
  }

  getSupportedLanguages(): string[] {
    return Object.keys(SARVAM_LANGUAGES);
  }
}

// Create singleton instance
const sarvamTTSInstance = new SarvamTTSService();

// Export the service with bound methods
export const sarvamTTS = {
  speak: sarvamTTSInstance.speak.bind(sarvamTTSInstance),
  stop: sarvamTTSInstance.stop.bind(sarvamTTSInstance),
  pause: sarvamTTSInstance.pause.bind(sarvamTTSInstance),
  resume: sarvamTTSInstance.resume.bind(sarvamTTSInstance),
  isAvailable: sarvamTTSInstance.isAvailable.bind(sarvamTTSInstance),
  isSpeaking: sarvamTTSInstance.isSpeaking.bind(sarvamTTSInstance),
  isPausedState: sarvamTTSInstance.isPausedState.bind(sarvamTTSInstance),
  supportsLanguage: sarvamTTSInstance.supportsLanguage.bind(sarvamTTSInstance),
  getVoicesForLanguage: sarvamTTSInstance.getVoicesForLanguage.bind(sarvamTTSInstance),
  getSupportedLanguages: sarvamTTSInstance.getSupportedLanguages.bind(sarvamTTSInstance),
};

export default sarvamTTS;
