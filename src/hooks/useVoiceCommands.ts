/**
 * Voice Command Navigation Hook
 * 100% Token-Free - Uses pattern matching and cached data only
 * No Gemini API calls - all processing is local
 */

import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { AIAnalysis } from '@/integrations/supabase/types';

// Supported languages for voice commands
const VOICE_LANGUAGES: Record<string, string> = {
  'telugu': 'te-IN',
  'hindi': 'hi-IN',
  'tamil': 'ta-IN',
  'kannada': 'kn-IN',
  'malayalam': 'ml-IN',
  'marathi': 'mr-IN',
  'bengali': 'bn-IN',
  'gujarati': 'gu-IN',
  'punjabi': 'pa-IN',
  'english': 'en-IN',
};

// Intent patterns - Simplified for better matching
// Priority: Single words first, then phrases
// All lowercase for matching
// Telugu patterns use phonetic representations (lowercase)
const INTENT_PATTERNS: Record<string, string[]> = {
  // HIGH PRIORITY - Single word triggers (most reliable)
  READ_SUMMARY: [
    // English
    'summary', 'summarize', 'summarise', 'summery', 'some marie', 'some mary', 'samari',
    'read', 'explain', 'tell',
    // Telugu
    'సారాంశం', 'సారాంశ', 'చదవండి', 'చదువు', 'చెప్పండి', 'చెప్పు',
    'saaramsam', 'saaram', 'chadavandi', 'chepandi', 'cheppu',
  ],
  GET_DEADLINES: [
    // English
    'deadline', 'deadlines', 'date', 'dates', 'when', 'due', 'expiry', 'expires', 'validity',
    // Telugu
    'గడువు', 'గడువులు', 'తేదీ', 'తేదీలు', 'ఎప్పుడు', 'కాలం',
    'gaduvu', 'teedi', 'teduvu', 'appudu', 'kalam',
  ],
  GET_KEY_INFO: [
    // English
    'important', 'key', 'info', 'information', 'details', 'highlights', 'points', 'main',
    // Telugu
    'ముఖ్యమైన', 'ముఖ్యమైనవి', 'సమాచారం', 'విషయాలు', 'వివరాలు',
    'mukhya', 'mukhyam', 'samacharam', 'vishayalu', 'vivaraalu',
  ],
  WARNINGS: [
    // English
    'warning', 'warnings', 'problem', 'problems', 'issue', 'issues', 'concern', 'concerns', 'risk', 'risks',
    // Telugu
    'హెచ్చరికలు', 'హెచ్చరిక', 'సమస్య', 'సమస్యలు', 'ఆపద', 'ఖతరా',
    'hechcharika', 'samasya', 'apada', 'khatara',
  ],
  GET_TYPE: [
    // English
    'type', 'kind', 'category', 'classify', 'classification',
    // Telugu
    'రకం', 'రకాలు', 'విధమైన', 'వర్గం', 'రకమేది',
    'rakam', 'vidha', 'vargam',
  ],
  GET_ACTIONS: [
    // English
    'action', 'actions', 'todo', 'step', 'steps', 'do',
    // Telugu
    'చేయవలసిన', 'చేయాలి', 'క్రమం', 'పయనాలు', 'సూచన',
    'cheya', 'cheyavalu', 'kramamaa', 'payana', 'suuchana',
  ],
  GET_AMOUNT: [
    // English
    'amount', 'money', 'price', 'cost', 'fee', 'payment', 'pay', 'total', 'rupees', 'dollars',
    // Telugu
    'అంతా', 'ఆ', 'ధర', 'ధరలు', 'ఖర్చు', 'సరిపెట్టుకో', 'చెల్లించు',
    'anta', 'dhara', 'kharchu', 'sari', 'chellinca',
  ],
  STOP: [
    // English
    'stop', 'pause', 'quiet', 'silence', 'cancel', 'enough', 'ok', 'okay', 'thanks', 'thank',
    // Telugu
    'ఆపు', 'నిలిపివేయు', 'సరిగా', 'సరి', 'ఆపేసేయు',
    'aapu', 'nilipuvu', 'sariga', 'aapeseyu',
  ],
  HELP: [
    // English
    'help', 'commands', 'options', 'how', 'what can',
    // Telugu
    'సహాయం', 'సహాయ', 'ఆదేశాలు', 'ఎలా', 'ఏమిటి', 'గురించి',
    'sahayam', 'ela', 'emiti', 'aadeshalu',
  ],
  REPEAT: [
    // English
    'repeat', 'again', 'pardon', 'sorry', 'once more',
    // Telugu
    'నిరిక్షించు', 'మళ్లీ', 'మరోసారి', 'పునరావృత్తి', 'అది',
    'nirikshinchu', 'malli', 'marosari', 'punaraavritti',
  ],
  DOWNLOAD: [
    // English
    'download', 'save', 'export', 'pdf',
    // Telugu
    'డౌన్‌లోడ్', 'సేవ్', 'నిల్వ చేయు', 'వెలిపెట్టు', 'ఎక్స్‌పోర్ట్',
    'download', 'save', 'nilva', 'velipedu', 'export',
  ],
  SHARE: [
    // English
    'share', 'send', 'link',
    // Telugu
    'పంచుకో', 'పంపించు', 'లింక్', 'పంచు', 'పంపుతూ',
    'panchuko', 'pampinchu', 'panchu', 'link',
  ],
  READ_FULL: [
    // English
    'full', 'everything', 'all', 'entire', 'complete', 'whole',
    // Telugu
    'పూర్తిగా', 'అందరికి', 'సంపూర్ణ', 'మొత్తం', 'సమ్మతుకు',
    'purtiga', 'sampurna', 'mottam', 'andariki',
  ],
  TRANSLATE: [
    // English
    'translate', 'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'language',
    // Telugu
    'అనువాదం', 'భాష', 'మార్పు చేయు', 'ఆంధ్ర', 'హిందీ', 'తమిళ్',
    'anuvvadham', 'bhasha', 'maarpu', 'andhra', 'hindi', 'tamil',
  ],
};

// Common speech recognition mistakes and their corrections
// Includes English and Telugu variants
const SPEECH_CORRECTIONS: Record<string, string> = {
  // English corrections
  'some marie': 'summary',
  'some mary': 'summary',
  'some merry': 'summary',
  'summery': 'summary',
  'samari': 'summary',
  'samarie': 'summary',
  'dead line': 'deadline',
  'dead lines': 'deadlines',
  'dad lines': 'deadlines',
  'datelines': 'deadlines',
  'warning': 'warnings',
  'worn ings': 'warnings',
  'prob lems': 'problems',
  'down load': 'download',
  'dawn load': 'download',
  'sher': 'share',
  'sheer': 'share',
  'trans late': 'translate',
  'repete': 'repeat',
  're pete': 'repeat',
  'stopp': 'stop',
  'stap': 'stop',
  'halp': 'help',
  'held': 'help',
  // Telugu corrections - phonetic variations
  'sarama': 'saaramsam',
  'saraam': 'saaramsam',
  'saaram': 'saaramsam',
  'gaadu': 'gaduvu',
  'gadduvu': 'gaduvu',
  'tedi': 'teedi',
  'mukhya': 'mukhyam',
  'hechcha': 'hechcharika',
  'samasya': 'samasya',
  'cheyava': 'cheyavalusina',
  'aapu': 'aapu',
  'aapesu': 'aapu',
  'sahayam': 'sahayam',
  'panchuku': 'panchuko',
  'pampi': 'pampinchu',
  'nilwa': 'nilva',
  'dhara': 'dhara',
  'kharcha': 'kharchu',
  'malli': 'malli',
  'marosa': 'marosari',
  'anuvvad': 'anuvvadham',
  'bhasha': 'bhasha',
  // More phonetic variants for Telugu recognition
  'saramsam': 'saaramsam',
  'saramsha': 'saaramsam',
  'saransh': 'saaramsam',
  'saraamsh': 'saaramsam',
  'gadvu': 'gaduvu',
  'gaduv': 'gaduvu',
  'tedhi': 'teedi',
  'thedhi': 'teedi',
  'aapuu': 'aapu',
  'appu': 'aapu',
};

// Telugu response templates - 100% token-free, pre-written responses
const TELUGU_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `ఇదిగో సారాంశం: ${summary}`,
    noData: 'ఈ డాక్యుమెంట్‌కి సారాంశం అందుబాటులో లేదు. దయచేసి విశ్లేషణ పూర్తయ్యే వరకు వేచి ఉండండి.',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `ఈ డాక్యుమెంట్‌లో గడువులు కనుగొన్నాను. ${deadlines}`,
    noData: 'ఈ డాక్యుమెంట్‌లో గడువులు కనుగొనబడలేదు.',
  },
  GET_KEY_INFO: {
    withData: (info) => `ముఖ్యమైన సమాచారం ఇక్కడ ఉంది: ${info}`,
    noData: 'ఈ డాక్యుమెంట్ నుండి ముఖ్యమైన సమాచారం ఇంకా తీయబడలేదు.',
  },
  GET_TYPE: {
    withData: (type) => `ఇది ${type} డాక్యుమెంట్.`,
    noData: 'డాక్యుమెంట్ రకాన్ని నిర్ధారించలేకపోయాను.',
  },
  GET_ACTIONS: {
    withData: (actions) => `సూచించిన చర్యలు ఇక్కడ ఉన్నాయి: ${actions}`,
    noData: 'ఈ డాక్యుమెంట్‌కు నిర్దిష్ట చర్యలు అవసరం లేదు.',
  },
  GET_AMOUNT: {
    withData: (amount) => `ఈ మొత్తం సమాచారం కనుగొన్నాను: ${amount}`,
    noData: 'ఈ డాక్యుమెంట్‌లో డబ్బు మొత్తాలు కనుగొనబడలేదు.',
  },
  WARNINGS: {
    withData: (warnings) => `హెచ్చరిక! ${warnings}`,
    noData: 'ఈ డాక్యుమెంట్‌లో హెచ్చరికలు లేదా ఆందోళనలు కనుగొనబడలేదు.',
  },
  STOP: {
    withData: () => 'సరే, ఆపుతున్నాను.',
    noData: 'సరే, ఆపుతున్నాను.',
  },
  HELP: {
    withData: () => 'మీరు తెలుగులో మాట్లాడవచ్చు! ఈ ఆదేశాలు ప్రయత్నించండి: సారాంశం చదవండి, గడువులు ఏమిటి, ముఖ్యమైన సమాచారం, హెచ్చరికలు, డౌన్‌లోడ్, షేర్, లేదా ఆపు.',
    noData: 'మీరు తెలుగులో మాట్లాడవచ్చు! ఈ ఆదేశాలు ప్రయత్నించండి: సారాంశం, గడువులు, ముఖ్యమైన, హెచ్చరికలు, ఆపు.',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'ఇంకా పునరావృతం చేయడానికి ఏమీ లేదు. ముందుగా నన్ను ఏదైనా అడగండి.',
  },
  DOWNLOAD: {
    withData: () => 'డౌన్‌లోడ్ ఆప్షన్ తెరుస్తున్నాను. డాక్యుమెంట్‌ను సేవ్ చేయడానికి డౌన్‌లోడ్ PDF బటన్ క్లిక్ చేయండి.',
    noData: 'డౌన్‌లోడ్ ఆప్షన్ తెరుస్తున్నాను. డాక్యుమెంట్‌ను సేవ్ చేయడానికి డౌన్‌లోడ్ PDF బటన్ క్లిక్ చేయండి.',
  },
  SHARE: {
    withData: () => 'షేర్ ఆప్షన్ తెరుస్తున్నాను. ఈ డాక్యుమెంట్‌ను షేర్ చేయడానికి షేర్ బటన్ క్లిక్ చేయండి.',
    noData: 'షేర్ ఆప్షన్ తెరుస్తున్నాను. ఈ డాక్యుమెంట్‌ను షేర్ చేయడానికి షేర్ బటన్ క్లిక్ చేయండి.',
  },
  READ_FULL: {
    withData: (text) => `డాక్యుమెంట్ టెక్స్ట్ ఇక్కడ ఉంది: ${text}`,
    noData: 'ఈ డాక్యుమెంట్ నుండి టెక్స్ట్ ఇంకా తీయబడలేదు.',
  },
  TRANSLATE: {
    withData: (lang) => `సరే, ${lang} లోకి అనువదిస్తాను. పూర్తి అనువాదం వినడానికి యాప్‌లో అనువాద బటన్ ఉపయోగించండి.`,
    noData: 'అనువాదం కోసం దయచేసి భాషను ఎంచుకోండి.',
  },
  UNKNOWN: {
    withData: () => 'క్షమించండి, నాకు అర్థం కాలేదు. అందుబాటులో ఉన్న ఆదేశాలను వినడానికి సహాయం అని చెప్పండి.',
    noData: 'క్షమించండి, నాకు అర్థం కాలేదు. అందుబాటులో ఉన్న ఆదేశాలను వినడానికి సహాయం అని చెప్పండి.',
  },
};

// Hindi response templates
const HINDI_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `यहाँ सारांश है: ${summary}`,
    noData: 'इस दस्तावेज़ के लिए सारांश उपलब्ध नहीं है। कृपया विश्लेषण पूर्ण होने तक प्रतीक्षा करें।',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `इस दस्तावेज़ में समय सीमाएं मिलीं। ${deadlines}`,
    noData: 'इस दस्तावेज़ में कोई समय सीमा नहीं मिली।',
  },
  GET_KEY_INFO: {
    withData: (info) => `यहाँ महत्वपूर्ण जानकारी है: ${info}`,
    noData: 'इस दस्तावेज़ से अभी तक कोई महत्वपूर्ण जानकारी नहीं निकाली गई।',
  },
  GET_TYPE: {
    withData: (type) => `यह एक ${type} दस्तावेज़ है।`,
    noData: 'दस्तावेज़ का प्रकार निर्धारित नहीं कर सका।',
  },
  GET_ACTIONS: {
    withData: (actions) => `यहाँ सुझाई गई कार्रवाइयां हैं: ${actions}`,
    noData: 'इस दस्तावेज़ के लिए कोई विशेष कार्रवाई आवश्यक नहीं है।',
  },
  GET_AMOUNT: {
    withData: (amount) => `यह राशि जानकारी मिली: ${amount}`,
    noData: 'इस दस्तावेज़ में कोई राशि नहीं मिली।',
  },
  WARNINGS: {
    withData: (warnings) => `चेतावनी! ${warnings}`,
    noData: 'इस दस्तावेज़ में कोई चेतावनी या चिंताएं नहीं मिलीं।',
  },
  STOP: {
    withData: () => 'ठीक है, रुक रहा हूं।',
    noData: 'ठीक है, रुक रहा हूं।',
  },
  HELP: {
    withData: () => 'आप हिंदी में बोल सकते हैं! ये आदेश आज़माएं: सारांश पढ़ो, समय सीमाएं क्या हैं, महत्वपूर्ण जानकारी, चेतावनियां, डाउनलोड, शेयर, या रुको।',
    noData: 'आप हिंदी में बोल सकते हैं! ये आदेश आज़माएं: सारांश, समय सीमा, महत्वपूर्ण, चेतावनी, रुको।',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'अभी दोहराने के लिए कुछ नहीं है। पहले मुझसे कुछ पूछें।',
  },
  DOWNLOAD: {
    withData: () => 'डाउनलोड विकल्प खोल रहा हूं। दस्तावेज़ सहेजने के लिए PDF डाउनलोड बटन क्लिक करें।',
    noData: 'डाउनलोड विकल्प खोल रहा हूं। दस्तावेज़ सहेजने के लिए PDF डाउनलोड बटन क्लिक करें।',
  },
  SHARE: {
    withData: () => 'शेयर विकल्प खोल रहा हूं। इस दस्तावेज़ को शेयर करने के लिए शेयर बटन क्लिक करें।',
    noData: 'शेयर विकल्प खोल रहा हूं। इस दस्तावेज़ को शेयर करने के लिए शेयर बटन क्लिक करें।',
  },
  READ_FULL: {
    withData: (text) => `यहाँ दस्तावेज़ का पाठ है: ${text}`,
    noData: 'इस दस्तावेज़ से अभी तक कोई पाठ नहीं निकाला गया।',
  },
  TRANSLATE: {
    withData: (lang) => `ठीक है, ${lang} में अनुवाद करूंगा। पूर्ण अनुवाद सुनने के लिए ऐप में अनुवाद बटन का उपयोग करें।`,
    noData: 'कृपया अनुवाद के लिए भाषा चुनें।',
  },
  UNKNOWN: {
    withData: () => 'क्षमा करें, मुझे समझ नहीं आया। उपलब्ध आदेशों को सुनने के लिए मदद कहें।',
    noData: 'क्षमा करें, मुझे समझ नहीं आया। उपलब्ध आदेशों को सुनने के लिए मदद कहें।',
  },
};

// Get language code base (te from te-IN)
const getLanguageBase = (langCode: string): string => langCode.split('-')[0];

export type VoiceIntent = 
  | 'READ_SUMMARY' 
  | 'GET_DEADLINES' 
  | 'GET_KEY_INFO' 
  | 'GET_TYPE'
  | 'GET_ACTIONS'
  | 'GET_AMOUNT'
  | 'TRANSLATE' 
  | 'STOP' 
  | 'HELP'
  | 'REPEAT'
  | 'DOWNLOAD'
  | 'SHARE'
  | 'READ_FULL'
  | 'WARNINGS'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  intent: VoiceIntent;
  params: {
    language?: string;
    languageCode?: string;
  };
  transcript: string;
  response: string;
}

interface UseVoiceCommandsProps {
  aiAnalysis?: AIAnalysis | null;
  extractedText?: string;
  documentType?: string;
  onSpeak: (text: string, options?: { languageCode?: string }) => Promise<void>;
  onStop: () => void;
  onTranslate?: (targetLang: string) => void;
  currentLanguage?: string;
}

export const useVoiceCommands = ({
  aiAnalysis,
  extractedText,
  documentType,
  onSpeak,
  onStop,
  onTranslate,
  currentLanguage = 'en-IN'
}: UseVoiceCommandsProps) => {
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastResponseRef = useRef<string>('');
  const [commandLanguage, setCommandLanguage] = useState<string>('en-IN'); // Language for voice commands

  // Use existing speech recognition hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    isSupported
  } = useSpeechRecognition();

  // Apply speech corrections for common recognition errors
  const correctSpeech = useCallback((text: string): string => {
    let corrected = text.toLowerCase().trim();
    
    // Apply known corrections
    for (const [mistake, correction] of Object.entries(SPEECH_CORRECTIONS)) {
      corrected = corrected.replace(new RegExp(mistake, 'gi'), correction);
    }
    
    return corrected;
  }, []);

  // Calculate similarity between two words (simple Levenshtein-inspired)
  const wordSimilarity = useCallback((word1: string, word2: string): number => {
    if (word1 === word2) return 1;
    if (word1.includes(word2) || word2.includes(word1)) return 0.8;
    
    // Check if words start with same letters
    const minLen = Math.min(word1.length, word2.length);
    let matchCount = 0;
    for (let i = 0; i < minLen; i++) {
      if (word1[i] === word2[i]) matchCount++;
      else break;
    }
    
    if (matchCount >= 3) return 0.6; // First 3+ chars match
    return 0;
  }, []);

  // Detect intent from transcript - Smart pattern matching
  const detectIntent = useCallback((text: string): { intent: VoiceIntent; params: any } => {
    // Step 1: Clean and correct the text
    const correctedText = correctSpeech(text);
    const words = correctedText.split(/\s+/).filter(w => w.length > 0);
    
    console.log('🎤 Voice Command - Original:', text);
    console.log('🎤 Voice Command - Corrected:', correctedText);
    console.log('🎤 Voice Command - Words:', words);

    // Step 2: Try exact word match first (highest priority)
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const patternLower = pattern.toLowerCase();
        
        // Check if any word exactly matches the pattern
        if (words.includes(patternLower)) {
          console.log('✅ Exact word match:', intent, '←', patternLower);
          
          if (intent === 'TRANSLATE') {
            const detectedLang = Object.keys(VOICE_LANGUAGES).find(lang => 
              correctedText.includes(lang)
            );
            return {
              intent: intent as VoiceIntent,
              params: {
                language: detectedLang || 'hindi',
                languageCode: VOICE_LANGUAGES[detectedLang || 'hindi']
              }
            };
          }
          return { intent: intent as VoiceIntent, params: {} };
        }
      }
    }

    // Step 3: Try phrase/substring match
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const patternLower = pattern.toLowerCase();
        
        if (correctedText.includes(patternLower)) {
          console.log('✅ Phrase match:', intent, '←', patternLower);
          
          if (intent === 'TRANSLATE') {
            const detectedLang = Object.keys(VOICE_LANGUAGES).find(lang => 
              correctedText.includes(lang)
            );
            return {
              intent: intent as VoiceIntent,
              params: {
                language: detectedLang || 'hindi',
                languageCode: VOICE_LANGUAGES[detectedLang || 'hindi']
              }
            };
          }
          return { intent: intent as VoiceIntent, params: {} };
        }
      }
    }

    // Step 4: Try fuzzy matching for single words
    for (const word of words) {
      if (word.length < 3) continue; // Skip very short words
      
      for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of patterns) {
          const patternLower = pattern.toLowerCase();
          const similarity = wordSimilarity(word, patternLower);
          
          if (similarity >= 0.6) {
            console.log('✅ Fuzzy match:', intent, '← word:', word, '~ pattern:', patternLower);
            return { intent: intent as VoiceIntent, params: {} };
          }
        }
      }
    }
    
    console.log('❌ No intent matched for:', correctedText);
    return { intent: 'UNKNOWN', params: {} };
  }, [correctSpeech, wordSimilarity]);

  // Generate response based on intent - uses CACHED data only, NO API calls
  // Language-aware: Returns Telugu/Hindi responses when those languages are selected
  const generateResponse = useCallback((intent: VoiceIntent, params: any): string => {
    const langBase = getLanguageBase(commandLanguage);
    const isTeluguMode = langBase === 'te';
    const isHindiMode = langBase === 'hi';
    
    // Check if text contains Telugu/Hindi script (non-ASCII Indian language characters)
    const isTeluguText = (text: string): boolean => /[\u0C00-\u0C7F]/.test(text);
    const isHindiText = (text: string): boolean => /[\u0900-\u097F]/.test(text);
    const isIndianLanguageText = (text: string): boolean => isTeluguText(text) || isHindiText(text);
    
    // Get appropriate response template based on language
    // Only use localized template if:
    // 1. User selected that language mode AND
    // 2. Data is in that language (or no data - just static message)
    const getLocalizedResponse = (intentKey: string, data?: string): string => {
      // If we have data, check if it's already in the target language
      const dataInTargetLang = data ? (
        (isTeluguMode && isTeluguText(data)) ||
        (isHindiMode && isHindiText(data)) ||
        isIndianLanguageText(data) // Data is already translated
      ) : true; // No data means static message, always localize
      
      if (isTeluguMode && TELUGU_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? TELUGU_RESPONSES[intentKey].withData(data) : TELUGU_RESPONSES[intentKey].noData;
      }
      if (isHindiMode && HINDI_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? HINDI_RESPONSES[intentKey].withData(data) : HINDI_RESPONSES[intentKey].noData;
      }
      
      // If user wants Telugu/Hindi but data is in English, 
      // return just the data (without mixing languages awkwardly)
      if ((isTeluguMode || isHindiMode) && data && !dataInTargetLang) {
        // Use noData template (pure Telugu/Hindi) followed by the English data
        // This avoids weird mixing like "ఇదిగో సారాంశం: This is an English summary"
        if (isTeluguMode && TELUGU_RESPONSES[intentKey]) {
          return data; // Just speak the English data, TTS will handle it
        }
        if (isHindiMode && HINDI_RESPONSES[intentKey]) {
          return data;
        }
      }
      
      return ''; // Return empty to use English fallback
    };
    
    switch (intent) {
      case 'READ_SUMMARY':
        if (aiAnalysis?.speakableSummary) {
          const localResp = getLocalizedResponse('READ_SUMMARY', aiAnalysis.speakableSummary);
          return localResp || aiAnalysis.speakableSummary;
        }
        if (aiAnalysis?.summary) {
          const localResp = getLocalizedResponse('READ_SUMMARY', aiAnalysis.summary);
          return localResp || `Here's the summary: ${aiAnalysis.summary}`;
        }
        return getLocalizedResponse('READ_SUMMARY') || "No summary available for this document. Please wait for the analysis to complete.";

      case 'GET_DEADLINES':
        if (aiAnalysis?.deadlines && aiAnalysis.deadlines.length > 0) {
          const deadlineText = aiAnalysis.deadlines.join('. ');
          const localResp = getLocalizedResponse('GET_DEADLINES', deadlineText);
          return localResp || `I found ${aiAnalysis.deadlines.length} deadline${aiAnalysis.deadlines.length > 1 ? 's' : ''} in this document. ${deadlineText}`;
        }
        return getLocalizedResponse('GET_DEADLINES') || "No deadlines found in this document.";

      case 'GET_KEY_INFO':
        if (aiAnalysis?.keyInformation && aiAnalysis.keyInformation.length > 0) {
          const keyInfo = aiAnalysis.keyInformation.slice(0, 5).join('. ');
          const localResp = getLocalizedResponse('GET_KEY_INFO', keyInfo);
          return localResp || `Here's the key information: ${keyInfo}`;
        }
        return getLocalizedResponse('GET_KEY_INFO') || "No key information extracted from this document yet.";

      case 'GET_TYPE':
        if (documentType) {
          const localResp = getLocalizedResponse('GET_TYPE', documentType);
          return localResp || `This is a ${documentType} document.`;
        }
        if (aiAnalysis?.documentType) {
          const localResp = getLocalizedResponse('GET_TYPE', aiAnalysis.documentType);
          return localResp || `This appears to be a ${aiAnalysis.documentType} document.`;
        }
        return getLocalizedResponse('GET_TYPE') || "I couldn't determine the document type.";

      case 'GET_ACTIONS':
        if (aiAnalysis?.suggestedActions && aiAnalysis.suggestedActions.length > 0) {
          const actions = aiAnalysis.suggestedActions.slice(0, 3).join('. ');
          const localResp = getLocalizedResponse('GET_ACTIONS', actions);
          return localResp || `Here are the suggested actions: ${actions}`;
        }
        return getLocalizedResponse('GET_ACTIONS') || "No specific actions required for this document.";

      case 'GET_AMOUNT':
        // Look for amounts in key information
        if (aiAnalysis?.keyInformation) {
          const amountInfo = aiAnalysis.keyInformation.find(info => 
            /₹|rs|rupee|dollar|\$|amount|payment|fee|cost/i.test(info)
          );
          if (amountInfo) {
            const localResp = getLocalizedResponse('GET_AMOUNT', amountInfo);
            return localResp || `I found this amount information: ${amountInfo}`;
          }
        }
        return getLocalizedResponse('GET_AMOUNT') || "No monetary amounts found in this document.";

      case 'TRANSLATE': {
        const langName = params.language || 'hindi';
        const localTranslateResp = getLocalizedResponse('TRANSLATE', langName);
        return localTranslateResp || `Okay, I'll translate to ${langName}. Please use the translate button in the app to hear the full translation.`;
      }

      case 'STOP':
        return getLocalizedResponse('STOP') || "Okay, stopping.";

      case 'HELP':
        return getLocalizedResponse('HELP') || "You can speak in English, Telugu, Hindi, or Tamil! Try saying: Read the summary, What are the deadlines, Key information, Warnings, Download PDF, Share, or Stop. In Telugu, say: సారాంశం చదవండి. In Hindi, say: सारांश पढ़ो.";

      case 'REPEAT':
        if (lastResponseRef.current) {
          return getLocalizedResponse('REPEAT', lastResponseRef.current) || lastResponseRef.current;
        }
        return getLocalizedResponse('REPEAT') || "Nothing to repeat yet. Try asking me something first.";

      case 'DOWNLOAD':
        return getLocalizedResponse('DOWNLOAD') || "Opening download option. Please click the Download PDF button to save the document.";

      case 'SHARE':
        return getLocalizedResponse('SHARE') || "Opening share option. Please click the Share button to share this document.";

      case 'READ_FULL':
        if (extractedText) {
          // Return first 500 chars to avoid very long speech
          const preview = extractedText.substring(0, 500);
          const suffix = extractedText.length > 500 ? (isTeluguMode ? '... డాక్యుమెంట్ మరింత కొనసాగుతుంది.' : isHindiMode ? '... दस्तावेज़ आगे जारी है।' : '... The document continues further.') : '';
          const localResp = getLocalizedResponse('READ_FULL', preview + suffix);
          return localResp || `Here's the document text: ${preview}${suffix}`;
        }
        return getLocalizedResponse('READ_FULL') || "No text extracted from this document yet.";

      case 'WARNINGS':
        if (aiAnalysis?.warnings && aiAnalysis.warnings.length > 0) {
          const warnings = aiAnalysis.warnings.slice(0, 3).join('. ');
          const localResp = getLocalizedResponse('WARNINGS', warnings);
          return localResp || `Warning! ${warnings}`;
        }
        return getLocalizedResponse('WARNINGS') || "No warnings or concerns found in this document.";

      case 'UNKNOWN':
        return getLocalizedResponse('UNKNOWN') || "Sorry, I didn't understand that. Say 'help' to hear available commands. You can speak in English, Telugu, Hindi, or Tamil.";

      default:
        return getLocalizedResponse('UNKNOWN') || "I'm not sure how to help with that.";
    }
  }, [aiAnalysis, documentType, commandLanguage, extractedText]);

  // Process voice command
  const processCommand = useCallback(async (commandText: string) => {
    if (!commandText.trim()) return null;

    console.log('🎤 Processing voice command:', commandText);
    setIsProcessing(true);
    
    try {
      const { intent, params } = detectIntent(commandText);
      console.log('🎯 Detected intent:', intent, 'params:', params);
      const response = generateResponse(intent, params);
      console.log('💬 Generated response:', response.substring(0, 100) + '...');
      
      const result: VoiceCommandResult = {
        intent,
        params,
        transcript: commandText,
        response
      };
      
      setLastCommand(result);
      
      // Store for repeat command
      if (intent !== 'REPEAT' && intent !== 'STOP' && intent !== 'HELP') {
        lastResponseRef.current = response;
      }

      // Execute the command
      if (intent === 'STOP') {
        onStop();
        // Don't wait for anything, just stop immediately
        setIsProcessing(false);
        return result;
      } else if (intent === 'TRANSLATE' && onTranslate) {
        onTranslate(params.languageCode || 'hi-IN');
        // Speak in the selected command language (response is already localized)
        onSpeak(response, { languageCode: commandLanguage }).catch(() => {});
      } else {
        // Speak in the selected command language
        // Response text is already localized (Telugu/Hindi/English based on commandLanguage)
        onSpeak(response, { languageCode: commandLanguage }).catch(() => {});
      }

      return result;
    } finally {
      // Small delay to show processing state, then clear it
      setTimeout(() => setIsProcessing(false), 300);
    }
  }, [detectIntent, generateResponse, onSpeak, onStop, onTranslate, commandLanguage]);

  // Start listening for commands with selected language
  const startCommandMode = useCallback((language?: string) => {
    const lang = language || commandLanguage;
    setIsCommandMode(true);
    console.log('🎤 Starting voice commands in language:', lang);
    startListening({ language: lang, continuous: false, interimResults: true });
  }, [startListening, commandLanguage]);

  // Stop listening
  const stopCommandMode = useCallback(() => {
    setIsCommandMode(false);
    stopListening();
  }, [stopListening]);

  // Set command language
  const setVoiceLanguage = useCallback((lang: string) => {
    setCommandLanguage(lang);
    console.log('🌐 Voice command language set to:', lang);
  }, []);

  // Process transcript when it changes
  const handleTranscript = useCallback(async () => {
    if (transcript && isCommandMode && !isProcessing) {
      stopCommandMode();
      await processCommand(transcript);
    }
  }, [transcript, isCommandMode, isProcessing, stopCommandMode, processCommand]);

  return {
    // State
    isCommandMode,
    isListening,
    isProcessing,
    lastCommand,
    transcript,
    speechError,
    isSupported,
    commandLanguage,
    
    // Actions
    startCommandMode,
    stopCommandMode,
    processCommand,
    handleTranscript,
    setVoiceLanguage,
    
    // Utils
    detectIntent,
    availableCommands: Object.keys(INTENT_PATTERNS),
    availableLanguages: VOICE_LANGUAGES
  };
};

export default useVoiceCommands;
