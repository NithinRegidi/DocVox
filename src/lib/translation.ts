// Translation Service using Google Gemini for translation
// Supports Indian regional languages and international languages

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API;

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

// Get language by code
export function getLanguageByCode(code: string): TranslationLanguage | undefined {
  return TRANSLATION_LANGUAGES.find(lang => lang.code === code);
}

// Check if translation service is available
export function isTranslationAvailable(): boolean {
  return !!GOOGLE_API_KEY;
}

// Translate text using Gemini AI
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured');
  }

  if (!text.trim()) {
    return '';
  }

  const targetLang = getLanguageByCode(targetLanguage);
  const sourceLang = sourceLanguage ? getLanguageByCode(sourceLanguage) : null;

  if (!targetLang) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  const prompt = sourceLang
    ? `Translate the following text from ${sourceLang.name} to ${targetLang.name}. 
       Provide only the translation, no explanations or additional text.
       Maintain the original formatting (paragraphs, bullet points, etc.).
       
       Text to translate:
       ${text}`
    : `Translate the following text to ${targetLang.name}. 
       Auto-detect the source language.
       Provide only the translation, no explanations or additional text.
       Maintain the original formatting (paragraphs, bullet points, etc.).
       
       Text to translate:
       ${text}`;

  // Try multiple Gemini models
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
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
              temperature: 0.1, // Low temperature for accurate translation
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Model ${model} failed:`, errorData);
        continue;
      }

      const data = await response.json();
      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (translation) {
        return translation.trim();
      }
    } catch (error) {
      console.warn(`Translation with ${model} failed:`, error);
      continue;
    }
  }

  throw new Error('Translation failed. Please try again.');
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
  const targetLang = getLanguageByCode(targetLanguage);
  if (!targetLang) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  // Combine all text for efficient translation
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

  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured');
  }

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
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
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) continue;

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
      console.warn(`Translation with ${model} failed:`, error);
      continue;
    }
  }

  throw new Error('Translation failed. Please try again.');
}

// Detect language of text
export async function detectLanguage(text: string): Promise<string> {
  if (!GOOGLE_API_KEY || !text.trim()) {
    return 'en';
  }

  const prompt = `Detect the language of the following text and respond with ONLY the ISO 639-1 language code (e.g., 'en', 'hi', 'ta', etc.):

${text.substring(0, 500)}`;

  try {
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

  return 'en'; // Default to English
}
