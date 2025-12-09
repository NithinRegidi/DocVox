// Translation Service using Google Gemini for translation
// Supports Indian regional languages and international languages
// Includes free fallback translation when API quota is exhausted

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API;

// Rate limit tracking
let lastApiCallTime = 0;
const MIN_DELAY_BETWEEN_CALLS = 1000; // 1 second minimum between calls
const MAX_RETRIES = 2; // Reduced retries to fail faster and use fallback
const BASE_RETRY_DELAY = 1500; // 1.5 seconds base delay for retries

// Track if Gemini is rate limited to skip directly to fallback
let geminiRateLimited = false;
let rateLimitResetTime = 0;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to ensure minimum delay between API calls
async function throttleApiCall(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < MIN_DELAY_BETWEEN_CALLS) {
    await delay(MIN_DELAY_BETWEEN_CALLS - timeSinceLastCall);
  }
  lastApiCallTime = Date.now();
}

// Check if we should skip Gemini due to recent rate limiting
function shouldSkipGemini(): boolean {
  if (!geminiRateLimited) return false;
  const now = Date.now();
  // Reset after 60 seconds
  if (now > rateLimitResetTime) {
    geminiRateLimited = false;
    console.log('✅ Gemini rate limit cooldown complete, will try Gemini again');
    return false;
  }
  return true;
}

// Mark Gemini as rate limited
function markGeminiRateLimited(): void {
  geminiRateLimited = true;
  rateLimitResetTime = Date.now() + 60000; // 60 second cooldown
  console.warn('⚠️ Gemini rate limited, using free translation for 60 seconds');
}

// FREE Translation using MyMemory API (no API key required, 5000 chars/day)
async function translateWithMyMemory(text: string, targetLang: string, sourceLang: string = 'en'): Promise<string | null> {
  try {
    // MyMemory has a 500 char limit per request, so chunk if needed
    const chunks = splitTextIntoChunks(text, 450);
    const translatedChunks: string[] = [];
    
    for (const chunk of chunks) {
      const langPair = `${sourceLang}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langPair}`;
      
      console.log(`🆓 Using free MyMemory translation (${sourceLang} → ${targetLang})...`);
      
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        translatedChunks.push(data.responseData.translatedText);
      } else {
        console.warn('MyMemory response issue:', data);
        return null;
      }
      
      // Small delay between chunks
      if (chunks.length > 1) await delay(300);
    }
    
    if (translatedChunks.length === chunks.length) {
      console.log('✅ Free translation successful!');
      return translatedChunks.join(' ');
    }
  } catch (error) {
    console.warn('MyMemory translation failed:', error);
  }
  return null;
}

// Split text into chunks for APIs with character limits
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?।])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence.length > maxLength ? sentence.substring(0, maxLength) : sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

export interface TranslationLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

// Supported languages for translation
export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  // Indian Languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  
  // International Languages
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
];

// Get language by code (supports both 'te' and 'te-IN' formats)
export function getLanguageByCode(code: string): TranslationLanguage | undefined {
  const baseCode = code?.split('-')[0]?.toLowerCase();
  return TRANSLATION_LANGUAGES.find(lang => 
    lang.code.toLowerCase() === code?.toLowerCase() || 
    lang.code.toLowerCase() === baseCode
  );
}

// Check if translation service is available
export function isTranslationAvailable(): boolean {
  return !!GOOGLE_API_KEY;
}

// Translate text using Gemini AI with free fallback
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  if (!text.trim()) {
    return '';
  }

  // Extract base language code (e.g., 'te' from 'te-IN')
  const targetLangCode = targetLanguage.split('-')[0];
  const sourceLangCode = sourceLanguage?.split('-')[0] || 'en';
  const targetLang = getLanguageByCode(targetLangCode);
  const sourceLang = sourceLanguage ? getLanguageByCode(sourceLangCode) : null;

  if (!targetLang) {
    console.warn(`Unsupported target language: ${targetLanguage}, using code directly`);
  }

  const targetLangName = targetLang?.name || targetLanguage;
  
  console.log(`🌐 Translating to ${targetLangName} (${targetLangCode})`);

  // If Gemini is rate limited, skip directly to free fallback
  if (shouldSkipGemini()) {
    console.log('⏭️ Skipping Gemini (rate limited), using free translation...');
    const freeResult = await translateWithMyMemory(text, targetLangCode, sourceLangCode);
    if (freeResult) return freeResult;
    throw new Error('Translation failed. Please try again later.');
  }

  // Try Gemini if API key available
  if (GOOGLE_API_KEY) {
    const prompt = sourceLang
      ? `Translate the following text from ${sourceLang.name} to ${targetLangName}. 
         Provide only the translation, no explanations or additional text.
         Maintain the original formatting (paragraphs, bullet points, etc.).
         
         Text to translate:
         ${text}`
      : `Translate the following text to ${targetLangName}. 
         Auto-detect the source language.
         Provide only the translation, no explanations or additional text.
         Maintain the original formatting (paragraphs, bullet points, etc.).
         
         Text to translate:
         ${text}`;

    // Only try gemini-2.0-flash (the model that actually exists)
    const model = 'gemini-2.0-flash';
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await throttleApiCall();
        
        console.log(`📡 Trying ${model} (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (response.status === 429) {
          // Rate limited - mark and use free fallback
          markGeminiRateLimited();
          console.log('🆓 Switching to free translation service...');
          const freeResult = await translateWithMyMemory(text, targetLangCode, sourceLangCode);
          if (freeResult) return freeResult;
          
          // If free also fails, wait and retry Gemini
          const retryDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
          console.warn(`⏳ Waiting ${retryDelay}ms before retry...`);
          await delay(retryDelay);
          continue;
        }

        if (!response.ok) {
          console.warn(`Model ${model} failed with status ${response.status}`);
          break;
        }

        const data = await response.json();
        const translation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (translation) {
          console.log(`✅ Translation successful with ${model}`);
          return translation.trim();
        }
      } catch (error) {
        console.warn(`Translation with ${model} attempt ${attempt + 1} failed:`, error);
      }
    }
  }

  // Final fallback to free translation
  console.log('🆓 Using free translation as final fallback...');
  const freeResult = await translateWithMyMemory(text, targetLangCode, sourceLangCode);
  if (freeResult) return freeResult;

  throw new Error('Translation failed. Please try again later.');
}

// Translate document analysis
export interface TranslatedAnalysis {
  summary: string;
  explanation: string;
  keyInformation: string[];
  suggestedActions: string[];
  warnings: string[];
  speakableSummary: string;
}

// Helper function to translate analysis fields individually using free translation
async function translateAnalysisWithFallback(
  analysis: {
    summary?: string;
    explanation?: string;
    keyInformation?: string[];
    suggestedActions?: string[];
    warnings?: string[];
    speakableSummary?: string;
  },
  targetLangCode: string
): Promise<TranslatedAnalysis | null> {
  try {
    console.log('🆓 Translating analysis with free service...');
    
    // Translate each field
    const summary = analysis.summary 
      ? await translateWithMyMemory(analysis.summary, targetLangCode, 'en') || analysis.summary
      : '';
    
    const explanation = analysis.explanation
      ? await translateWithMyMemory(analysis.explanation, targetLangCode, 'en') || analysis.explanation
      : '';
    
    const speakableSummary = analysis.speakableSummary
      ? await translateWithMyMemory(analysis.speakableSummary, targetLangCode, 'en') || analysis.speakableSummary
      : summary;
    
    // Translate arrays
    const keyInformation: string[] = [];
    for (const item of analysis.keyInformation || []) {
      const translated = await translateWithMyMemory(item, targetLangCode, 'en');
      keyInformation.push(translated || item);
    }
    
    const suggestedActions: string[] = [];
    for (const item of analysis.suggestedActions || []) {
      const translated = await translateWithMyMemory(item, targetLangCode, 'en');
      suggestedActions.push(translated || item);
    }
    
    const warnings: string[] = [];
    for (const item of analysis.warnings || []) {
      const translated = await translateWithMyMemory(item, targetLangCode, 'en');
      warnings.push(translated || item);
    }
    
    console.log('✅ Free analysis translation successful!');
    return {
      summary,
      explanation,
      keyInformation,
      suggestedActions,
      warnings,
      speakableSummary,
    };
  } catch (error) {
    console.warn('Free analysis translation failed:', error);
    return null;
  }
}

export async function translateAnalysis(
  analysis: {
    summary?: string;
    explanation?: string;
    keyInformation?: string[];
    suggestedActions?: string[];
    warnings?: string[];
    speakableSummary?: string;
  },
  targetLanguage: string
): Promise<TranslatedAnalysis> {
  const targetLangCode = targetLanguage.split('-')[0];
  const targetLang = getLanguageByCode(targetLangCode);
  
  if (!targetLang) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  // If Gemini is rate limited, skip directly to free fallback
  if (shouldSkipGemini()) {
    console.log('⏭️ Skipping Gemini for analysis (rate limited)...');
    const freeResult = await translateAnalysisWithFallback(analysis, targetLangCode);
    if (freeResult) return freeResult;
    throw new Error('Translation failed. Please try again later.');
  }

  // Combine all text for efficient translation with Gemini
  const textToTranslate = {
    summary: analysis.summary || '',
    explanation: analysis.explanation || '',
    keyInformation: analysis.keyInformation || [],
    suggestedActions: analysis.suggestedActions || [],
    warnings: analysis.warnings || [],
    speakableSummary: analysis.speakableSummary || '',
  };

  const prompt = `Translate the following JSON content to ${targetLang.name}. 
Return ONLY valid JSON with the same structure, translated values.
Do not add any explanation or markdown formatting.
Maintain the original meaning and tone.

${JSON.stringify(textToTranslate, null, 2)}`;

  if (GOOGLE_API_KEY) {
    const model = 'gemini-2.0-flash';
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await throttleApiCall();
        
        console.log(`📡 Translating analysis with ${model} (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (response.status === 429) {
          // Rate limited - mark and use free fallback
          markGeminiRateLimited();
          console.log('🆓 Switching to free translation for analysis...');
          const freeResult = await translateAnalysisWithFallback(analysis, targetLangCode);
          if (freeResult) return freeResult;
          
          const retryDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
          await delay(retryDelay);
          continue;
        }

        if (!response.ok) {
          console.warn(`Model ${model} failed with status ${response.status}`);
          break;
        }

        const data = await response.json();
        let translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (translatedText) {
          // Clean up response
          translatedText = translatedText.trim();
          if (translatedText.startsWith('```json')) {
            translatedText = translatedText.slice(7);
          } else if (translatedText.startsWith('```')) {
            translatedText = translatedText.slice(3);
          }
          if (translatedText.endsWith('```')) {
            translatedText = translatedText.slice(0, -3);
          }
          translatedText = translatedText.trim();

          const parsed = JSON.parse(translatedText);
          console.log(`✅ Analysis translation successful with ${model}`);
          return {
            summary: parsed.summary || '',
            explanation: parsed.explanation || '',
            keyInformation: Array.isArray(parsed.keyInformation) ? parsed.keyInformation : [],
            suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
            warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
            speakableSummary: parsed.speakableSummary || parsed.summary || '',
          };
        }
      } catch (error) {
        console.warn(`Translation analysis attempt ${attempt + 1} failed:`, error);
      }
    }
  }

  // Final fallback to free translation
  console.log('🆓 Using free translation for analysis as final fallback...');
  const freeResult = await translateAnalysisWithFallback(analysis, targetLangCode);
  if (freeResult) return freeResult;

  throw new Error('Translation failed. Please try again later.');
}

// Detect language of text
export async function detectLanguage(text: string): Promise<string> {
  if (!GOOGLE_API_KEY || !text.trim()) {
    return 'en';
  }

  const prompt = `Detect the language of the following text and respond with ONLY the ISO 639-1 language code (e.g., 'en', 'hi', 'ta', etc.):

${text.substring(0, 500)}`;

  try {
    // Throttle API calls to avoid rate limits
    await throttleApiCall();
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 10,
          },
        }),
      }
    );

    if (response.status === 429) {
      console.warn('⏳ Language detection rate limited, using fallback');
      return detectLanguageLocally(text);
    }

    if (response.ok) {
      const data = await response.json();
      const langCode = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
      
      // Validate it's a known language code
      if (langCode && TRANSLATION_LANGUAGES.some(l => l.code === langCode)) {
        return langCode;
      }
    }
  } catch (error) {
    console.warn('Language detection failed:', error);
  }

  return detectLanguageLocally(text);
}

// Local fallback for language detection using Unicode ranges
function detectLanguageLocally(text: string): string {
  // Telugu (U+0C00-0C7F)
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Hindi/Devanagari (U+0900-097F)
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  // Tamil (U+0B80-0BFF)
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Kannada (U+0C80-0CFF)
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Malayalam (U+0D00-0D7F)
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  // Bengali (U+0980-09FF)
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  // Gujarati (U+0A80-0AFF)
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  // Punjabi/Gurmukhi (U+0A00-0A7F)
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  // Odia (U+0B00-0B7F)
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
  // Arabic (U+0600-06FF)
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  // Chinese
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  // Japanese (Hiragana/Katakana)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  // Korean (Hangul)
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  // Russian/Cyrillic
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  
  return 'en'; // Default to English
}
