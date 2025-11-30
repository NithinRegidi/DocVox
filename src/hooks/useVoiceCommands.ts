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

// Intent patterns - NO AI needed, simple string matching
const INTENT_PATTERNS = {
  READ_SUMMARY: [
    'read summary', 'read the summary', 'summary', 'tell me summary',
    'what is this', 'what\'s this', 'what does it say', 'read it',
    'explain this', 'tell me about this', 'what is in this document',
    'summarize', 'give summary', 'document summary'
  ],
  GET_DEADLINES: [
    'deadline', 'deadlines', 'due date', 'due dates', 'when is it due',
    'important dates', 'dates', 'when', 'expiry', 'expires',
    'last date', 'submission date', 'payment date'
  ],
  GET_KEY_INFO: [
    'key info', 'key information', 'important info', 'important details',
    'main points', 'highlights', 'key points', 'important points',
    'what should i know', 'extracted info', 'details'
  ],
  GET_TYPE: [
    'document type', 'type of document', 'what type', 'what kind',
    'is this a', 'what document'
  ],
  GET_ACTIONS: [
    'action', 'actions', 'what to do', 'what should i do',
    'next steps', 'required actions', 'todo', 'to do'
  ],
  GET_AMOUNT: [
    'amount', 'money', 'price', 'cost', 'payment', 'fee',
    'how much', 'total', 'rupees', 'dollars'
  ],
  TRANSLATE: [
    'translate to', 'speak in', 'say in', 'convert to',
    'in telugu', 'in hindi', 'in tamil', 'in kannada',
    'in malayalam', 'in marathi', 'in bengali', 'in gujarati',
    'telugu lo', 'hindi mein', 'tamil la'
  ],
  STOP: [
    'stop', 'quiet', 'silence', 'shut up', 'enough', 'ok stop',
    'stop speaking', 'stop talking', 'pause', 'cancel'
  ],
  HELP: [
    'help', 'commands', 'what can you do', 'options',
    'available commands', 'voice commands', 'how to use'
  ],
  REPEAT: [
    'repeat', 'again', 'say again', 'one more time', 'repeat that'
  ]
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
  onSpeak: (text: string, options?: { language?: string }) => Promise<void>;
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

  // Use existing speech recognition hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    isSupported
  } = useSpeechRecognition({
    language: 'en-IN', // Commands in English for reliability
    continuous: false,
    interimResults: false
  });

  // Detect intent from transcript - NO API CALLS, pure pattern matching
  const detectIntent = useCallback((text: string): { intent: VoiceIntent; params: any } => {
    const lowerText = text.toLowerCase().trim();
    
    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern)) {
          // Special handling for TRANSLATE - extract target language
          if (intent === 'TRANSLATE') {
            const detectedLang = Object.keys(VOICE_LANGUAGES).find(lang => 
              lowerText.includes(lang)
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
    
    return { intent: 'UNKNOWN', params: {} };
  }, []);

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
        return "You can say: Read the summary, What are the deadlines, Tell me key information, What type of document is this, What actions should I take, Stop, or Repeat.";

      case 'REPEAT':
        return lastResponseRef.current || "Nothing to repeat yet. Try asking me something first.";

      case 'UNKNOWN':
        return "Sorry, I didn't understand that. Say 'help' to hear available commands.";

      default:
        return "I'm not sure how to help with that.";
    }
  }, [aiAnalysis, documentType]);

  // Process voice command
  const processCommand = useCallback(async (commandText: string) => {
    if (!commandText.trim()) return null;

    setIsProcessing(true);
    
    try {
      const { intent, params } = detectIntent(commandText);
      const response = generateResponse(intent, params);
      
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
      } else if (intent === 'TRANSLATE' && onTranslate) {
        onTranslate(params.languageCode || 'hi-IN');
        await onSpeak(response, { language: currentLanguage });
      } else {
        await onSpeak(response, { language: currentLanguage });
      }

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [detectIntent, generateResponse, onSpeak, onStop, onTranslate, currentLanguage]);

  // Start listening for commands
  const startCommandMode = useCallback(() => {
    setIsCommandMode(true);
    startListening();
  }, [startListening]);

  // Stop listening
  const stopCommandMode = useCallback(() => {
    setIsCommandMode(false);
    stopListening();
  }, [stopListening]);

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
    
    // Actions
    startCommandMode,
    stopCommandMode,
    processCommand,
    handleTranscript,
    
    // Utils
    detectIntent,
    availableCommands: Object.keys(INTENT_PATTERNS)
  };
};

export default useVoiceCommands;
