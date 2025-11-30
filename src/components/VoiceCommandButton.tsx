/**
 * Voice Command Button Component
 * A floating button that enables voice command navigation
 * 100% Token-Free - All processing is local
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Mic, MicOff, Volume2, HelpCircle, Loader2, Globe } from 'lucide-react';
import { useVoiceCommands, VoiceCommandResult } from '@/hooks/useVoiceCommands';
import { AIAnalysis } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Voice command languages with recognition support
const COMMAND_LANGUAGES = [
  { code: 'en-IN', name: 'English', flag: '🇬🇧' },
  { code: 'te-IN', name: 'Telugu', flag: '🇮🇳', hint: 'సారాంశం' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳', hint: 'सारांश' },
  { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳', hint: 'சுருக்கம்' },
  { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳', hint: 'ಸಾರಾಂಶ' },
  { code: 'ml-IN', name: 'Malayalam', flag: '🇮🇳', hint: 'സംഗ്രഹം' },
  { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳', hint: 'সারসংক্ষেপ' },
];

interface VoiceCommandButtonProps {
  aiAnalysis?: AIAnalysis | null;
  extractedText?: string;
  documentType?: string;
  onSpeak: (text: string, options?: { languageCode?: string }) => Promise<void>;
  onStop: () => void;
  onTranslate?: (targetLang: string) => void;
  currentLanguage?: string;
  disabled?: boolean;
  className?: string;
}

const AVAILABLE_COMMANDS = [
  { command: '"Summary" or "Read summary"', description: 'Hear document summary', emoji: '📄' },
  { command: '"Deadlines" or "Dates"', description: 'Get important dates', emoji: '📅' },
  { command: '"Important" or "Key info"', description: 'Important details', emoji: '🔑' },
  { command: '"Warnings" or "Problems"', description: 'Problems & concerns', emoji: '⚠️' },
  { command: '"Type" or "What type"', description: 'Document classification', emoji: '📋' },
  { command: '"Actions" or "What to do"', description: 'Suggested next steps', emoji: '✅' },
  { command: '"Download" or "Save"', description: 'Save document', emoji: '💾' },
  { command: '"Share" or "Send"', description: 'Share document', emoji: '🔗' },
  { command: '"Translate to Hindi"', description: 'Change language', emoji: '🌐' },
  { command: '"Stop" or "Pause"', description: 'Stop speaking', emoji: '🔇' },
  { command: '"Repeat" or "Again"', description: 'Repeat last response', emoji: '🔁' },
  { command: '"Help" or "Commands"', description: 'List all commands', emoji: '❓' },
];

// Quick command hints shown while listening - organized by language
const QUICK_HINTS: Record<string, { text: string; meaning: string }[]> = {
  'en-IN': [
    { text: 'Summary', meaning: 'Read summary' },
    { text: 'Deadlines', meaning: 'Get dates' },
    { text: 'Key info', meaning: 'Important points' },
    { text: 'Warnings', meaning: 'Problems' },
    { text: 'Download', meaning: 'Save PDF' },
    { text: 'Share', meaning: 'Share doc' },
    { text: 'Stop', meaning: 'Stop speaking' },
    { text: 'Help', meaning: 'All commands' },
  ],
  'te-IN': [
    { text: 'సారాంశం', meaning: 'Summary' },
    { text: 'గడువు', meaning: 'Deadlines' },
    { text: 'ముఖ్యమైన', meaning: 'Key info' },
    { text: 'హెచ్చరికలు', meaning: 'Warnings' },
    { text: 'డౌన్‌లోడ్', meaning: 'Download' },
    { text: 'పంచుకో', meaning: 'Share' },
    { text: 'ఆపు', meaning: 'Stop' },
    { text: 'సహాయం', meaning: 'Help' },
  ],
  'hi-IN': [
    { text: 'सारांश', meaning: 'Summary' },
    { text: 'तारीख', meaning: 'Deadlines' },
    { text: 'जानकारी', meaning: 'Key info' },
    { text: 'चेतावनी', meaning: 'Warnings' },
    { text: 'डाउनलोड', meaning: 'Download' },
    { text: 'शेयर', meaning: 'Share' },
    { text: 'रुको', meaning: 'Stop' },
    { text: 'मदद', meaning: 'Help' },
  ],
  'ta-IN': [
    { text: 'சுருக்கம்', meaning: 'Summary' },
    { text: 'காலக்கெடு', meaning: 'Deadlines' },
    { text: 'முக்கியம்', meaning: 'Key info' },
    { text: 'எச்சரிக்கை', meaning: 'Warnings' },
    { text: 'பதிவிறக்கம்', meaning: 'Download' },
    { text: 'பகிர்', meaning: 'Share' },
    { text: 'நிறுத்து', meaning: 'Stop' },
    { text: 'உதவி', meaning: 'Help' },
  ],
  'kn-IN': [
    { text: 'ಸಾರಾಂಶ', meaning: 'Summary' },
    { text: 'ಗಡುವು', meaning: 'Deadlines' },
    { text: 'ಮಾಹಿತಿ', meaning: 'Key info' },
    { text: 'ಎಚ್ಚರಿಕೆ', meaning: 'Warnings' },
    { text: 'ಡೌನ್‌ಲೋಡ್', meaning: 'Download' },
    { text: 'ಹಂಚು', meaning: 'Share' },
    { text: 'ನಿಲ್ಲಿಸು', meaning: 'Stop' },
    { text: 'ಸಹಾಯ', meaning: 'Help' },
  ],
  'ml-IN': [
    { text: 'സംഗ്രഹം', meaning: 'Summary' },
    { text: 'തീയതി', meaning: 'Deadlines' },
    { text: 'വിവരങ്ങൾ', meaning: 'Key info' },
    { text: 'മുന്നറിയിപ്പ്', meaning: 'Warnings' },
    { text: 'ഡൗൺലോഡ്', meaning: 'Download' },
    { text: 'പങ്കിടുക', meaning: 'Share' },
    { text: 'നിർത്തുക', meaning: 'Stop' },
    { text: 'സഹായം', meaning: 'Help' },
  ],
  'bn-IN': [
    { text: 'সারসংক্ষেপ', meaning: 'Summary' },
    { text: 'সময়সীমা', meaning: 'Deadlines' },
    { text: 'তথ্য', meaning: 'Key info' },
    { text: 'সতর্কতা', meaning: 'Warnings' },
    { text: 'ডাউনলোড', meaning: 'Download' },
    { text: 'শেয়ার', meaning: 'Share' },
    { text: 'থামো', meaning: 'Stop' },
    { text: 'সাহায্য', meaning: 'Help' },
  ],
};

const VoiceCommandButton = ({
  aiAnalysis,
  extractedText,
  documentType,
  onSpeak,
  onStop,
  onTranslate,
  currentLanguage = 'en-IN',
  disabled = false,
  className
}: VoiceCommandButtonProps) => {
  const [showHelp, setShowHelp] = useState(false);
  const [commandHistory, setCommandHistory] = useState<VoiceCommandResult[]>([]);

  const {
    isCommandMode,
    isListening,
    isProcessing,
    lastCommand,
    transcript,
    speechError,
    isSupported,
    startCommandMode,
    stopCommandMode,
    handleTranscript,
    commandLanguage,
    setVoiceLanguage
  } = useVoiceCommands({
    aiAnalysis,
    extractedText,
    documentType,
    onSpeak,
    onStop,
    onTranslate,
    currentLanguage
  });

  // Get current language info
  const currentLangInfo = COMMAND_LANGUAGES.find(l => l.code === commandLanguage) || COMMAND_LANGUAGES[0];

  // Process transcript when it changes
  useEffect(() => {
    if (transcript && isCommandMode) {
      handleTranscript();
    }
  }, [transcript, isCommandMode, handleTranscript]);

  // Track command history
  useEffect(() => {
    if (lastCommand) {
      setCommandHistory(prev => [lastCommand, ...prev.slice(0, 4)]);
    }
  }, [lastCommand]);

  const handleClick = () => {
    if (isListening) {
      stopCommandMode();
    } else {
      startCommandMode();
    }
  };

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" disabled className={className}>
              <MicOff className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voice commands not supported in this browser</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      {/* Language Selector for Voice Commands */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-9 px-2"
            disabled={isListening || isProcessing}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="text-xs">{currentLangInfo.flag} {currentLangInfo.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {COMMAND_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setVoiceLanguage(lang.code)}
              className={cn(
                "gap-2 cursor-pointer",
                commandLanguage === lang.code && "bg-accent"
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.hint && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {lang.hint}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Main Voice Command Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isListening ? "default" : "outline"}
              size="icon"
              onClick={handleClick}
              disabled={disabled || isProcessing}
              className={cn(
                "relative transition-all duration-300",
                isListening && "bg-red-500 hover:bg-red-600 animate-pulse",
                isProcessing && "bg-yellow-500 hover:bg-yellow-600"
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isListening ? (
                <Mic className="h-4 w-4 text-white" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              
              {/* Listening indicator ring */}
              {isListening && (
                <span className="absolute inset-0 rounded-md animate-ping bg-red-400 opacity-30" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isListening ? 'Listening... Say a command' : 'Click to give voice command'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Floating Command Hints - Shows while listening */}
      {isListening && (
        <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 min-w-[220px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                🎤 Listening in {currentLangInfo.name}...
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(QUICK_HINTS[commandLanguage] || QUICK_HINTS['en-IN']).map((hint, idx) => (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {hint.text}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{hint.meaning}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              💡 Say any command in {currentLangInfo.name}
            </p>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {isListening && (
        <Badge variant="destructive" className="animate-pulse">
          🎤 Listening...
        </Badge>
      )}
      
      {isProcessing && !isListening && (
        <Badge variant="secondary">
          ⚡ Processing...
        </Badge>
      )}

      {/* Live Transcript */}
      {transcript && isCommandMode && (
        <Badge variant="outline" className="max-w-[200px] truncate">
          "{transcript}"
        </Badge>
      )}

      {/* Help Popover */}
      <Popover open={showHelp} onOpenChange={setShowHelp}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Voice Commands</h4>
              <Badge variant="secondary" className="ml-auto text-xs">Token-Free</Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              Speak in any of these languages:
            </p>
            
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-[10px]">🇬🇧 English</Badge>
              <Badge variant="outline" className="text-[10px]">🇮🇳 తెలుగు</Badge>
              <Badge variant="outline" className="text-[10px]">🇮🇳 हिंदी</Badge>
              <Badge variant="outline" className="text-[10px]">🇮🇳 தமிழ்</Badge>
              <Badge variant="outline" className="text-[10px]">🇮🇳 ಕನ್ನಡ</Badge>
              <Badge variant="outline" className="text-[10px]">🇮🇳 മലയാളം</Badge>
              <Badge variant="outline" className="text-[10px]">🇮🇳 বাংলা</Badge>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {AVAILABLE_COMMANDS.map((cmd, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm py-1">
                  <span className="text-base">{cmd.emoji}</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs flex-1">
                    {cmd.command}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {cmd.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Recent Commands */}
            {commandHistory.length > 0 && (
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-medium mb-1">Recent:</p>
                {commandHistory.slice(0, 3).map((cmd, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    "{cmd.transcript}" → {cmd.intent}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Error Display */}
      {speechError && (
        <Badge variant="destructive" className="text-xs">
          {speechError}
        </Badge>
      )}
    </div>
  );
};

export default VoiceCommandButton;
