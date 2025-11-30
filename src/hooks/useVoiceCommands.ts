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
const INTENT_PATTERNS: Record<string, string[]> = {
  // HIGH PRIORITY - Single word triggers (most reliable)
  READ_SUMMARY: [
    'summary', 'summarize', 'summarise', 'summery', 'some marie', 'some mary', 'samari',
    'read', 'explain', 'tell',
  ],
  GET_DEADLINES: [
    'deadline', 'deadlines', 'date', 'dates', 'when', 'due', 'expiry', 'expires', 'validity',
  ],
  GET_KEY_INFO: [
    'important', 'key', 'info', 'information', 'details', 'highlights', 'points', 'main',
  ],
  WARNINGS: [
    'warning', 'warnings', 'problem', 'problems', 'issue', 'issues', 'concern', 'concerns', 'risk', 'risks',
  ],
  GET_TYPE: [
    'type', 'kind', 'category', 'classify', 'classification',
  ],
  GET_ACTIONS: [
    'action', 'actions', 'todo', 'step', 'steps', 'do',
  ],
  GET_AMOUNT: [
    'amount', 'money', 'price', 'cost', 'fee', 'payment', 'pay', 'total', 'rupees', 'dollars',
  ],
  STOP: [
    'stop', 'pause', 'quiet', 'silence', 'cancel', 'enough', 'ok', 'okay', 'thanks', 'thank',
  ],
  HELP: [
    'help', 'commands', 'options', 'how', 'what can',
  ],
  REPEAT: [
    'repeat', 'again', 'pardon', 'sorry', 'once more',
  ],
  DOWNLOAD: [
    'download', 'save', 'export', 'pdf',
  ],
  SHARE: [
    'share', 'send', 'link',
  ],
  READ_FULL: [
    'full', 'everything', 'all', 'entire', 'complete', 'whole',
  ],
  TRANSLATE: [
    'translate', 'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'language',
  ],
};

// Common speech recognition mistakes and their corrections
const SPEECH_CORRECTIONS: Record<string, string> = {
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
};

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
  const generateResponse = useCallback((intent: VoiceIntent, params: any): string => {
    switch (intent) {
      case 'READ_SUMMARY':
        if (aiAnalysis?.speakableSummary) {
          return aiAnalysis.speakableSummary;
        }
        if (aiAnalysis?.summary) {
          return `Here's the summary: ${aiAnalysis.summary}`;
        }
        return "No summary available for this document. Please wait for the analysis to complete.";

      case 'GET_DEADLINES':
        if (aiAnalysis?.deadlines && aiAnalysis.deadlines.length > 0) {
          const deadlineText = aiAnalysis.deadlines.join('. Next, ');
          return `I found ${aiAnalysis.deadlines.length} deadline${aiAnalysis.deadlines.length > 1 ? 's' : ''} in this document. ${deadlineText}`;
        }
        return "No deadlines found in this document.";

      case 'GET_KEY_INFO':
        if (aiAnalysis?.keyInformation && aiAnalysis.keyInformation.length > 0) {
          const keyInfo = aiAnalysis.keyInformation.slice(0, 5).join('. Also, ');
          return `Here's the key information: ${keyInfo}`;
        }
        return "No key information extracted from this document yet.";

      case 'GET_TYPE':
        if (documentType) {
          return `This is a ${documentType} document.`;
        }
        if (aiAnalysis?.documentType) {
          return `This appears to be a ${aiAnalysis.documentType} document.`;
        }
        return "I couldn't determine the document type.";

      case 'GET_ACTIONS':
        if (aiAnalysis?.suggestedActions && aiAnalysis.suggestedActions.length > 0) {
          const actions = aiAnalysis.suggestedActions.slice(0, 3).join('. Then, ');
          return `Here are the suggested actions: ${actions}`;
        }
        return "No specific actions required for this document.";

      case 'GET_AMOUNT':
        // Look for amounts in key information
        if (aiAnalysis?.keyInformation) {
          const amountInfo = aiAnalysis.keyInformation.find(info => 
            /₹|rs|rupee|dollar|\$|amount|payment|fee|cost/i.test(info)
          );
          if (amountInfo) {
            return `I found this amount information: ${amountInfo}`;
          }
        }
        return "No monetary amounts found in this document.";

      case 'TRANSLATE':
        const langName = params.language || 'hindi';
        return `Okay, I'll translate to ${langName}. Please use the translate button in the app to hear the full translation.`;

      case 'STOP':
        return "Okay, stopping.";

      case 'HELP':
        return "You can speak in English, Telugu, Hindi, or Tamil! Try saying: Read the summary, What are the deadlines, Key information, Warnings, Download PDF, Share, or Stop. In Telugu, say: సారాంశం చదవండి. In Hindi, say: सारांश पढ़ो.";

      case 'REPEAT':
        return lastResponseRef.current || "Nothing to repeat yet. Try asking me something first.";

      case 'DOWNLOAD':
        return "Opening download option. Please click the Download PDF button to save the document.";

      case 'SHARE':
        return "Opening share option. Please click the Share button to share this document.";

      case 'READ_FULL':
        if (extractedText) {
          // Return first 500 chars to avoid very long speech
          const preview = extractedText.substring(0, 500);
          return `Here's the document text: ${preview}${extractedText.length > 500 ? '... The document continues further.' : ''}`;
        }
        return "No text extracted from this document yet.";

      case 'WARNINGS':
        if (aiAnalysis?.warnings && aiAnalysis.warnings.length > 0) {
          const warnings = aiAnalysis.warnings.slice(0, 3).join('. Also, ');
          return `Warning! ${warnings}`;
        }
        return "No warnings or concerns found in this document.";

      case 'UNKNOWN':
        return "Sorry, I didn't understand that. Say 'help' to hear available commands. You can speak in English, Telugu, Hindi, or Tamil.";

      default:
        return "I'm not sure how to help with that.";
    }
  }, [aiAnalysis, documentType]);

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
        // Don't await - let it play in background
        // Use English for response since our responses are in English
        onSpeak(response, { languageCode: 'en-IN' }).catch(() => {});
      } else {
        // Don't await - let it play in background, user can stop anytime
        // IMPORTANT: Always use English for voice command responses
        // because our responses are written in English
        onSpeak(response, { languageCode: 'en-IN' }).catch(() => {});
      }

      return result;
    } finally {
      // Small delay to show processing state, then clear it
      setTimeout(() => setIsProcessing(false), 300);
    }
  }, [detectIntent, generateResponse, onSpeak, onStop, onTranslate, currentLanguage]);

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
