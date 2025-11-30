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
import { Mic, MicOff, Volume2, HelpCircle, Loader2 } from 'lucide-react';
import { useVoiceCommands, VoiceCommandResult } from '@/hooks/useVoiceCommands';
import { AIAnalysis } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

interface VoiceCommandButtonProps {
  aiAnalysis?: AIAnalysis | null;
  extractedText?: string;
  documentType?: string;
  onSpeak: (text: string, options?: { language?: string }) => Promise<void>;
  onStop: () => void;
  onTranslate?: (targetLang: string) => void;
  currentLanguage?: string;
  disabled?: boolean;
  className?: string;
}

const AVAILABLE_COMMANDS = [
  { command: '"Read the summary"', description: 'Hear document summary' },
  { command: '"What are the deadlines?"', description: 'Get important dates' },
  { command: '"Key information"', description: 'Important details' },
  { command: '"What type of document?"', description: 'Document classification' },
  { command: '"What actions to take?"', description: 'Suggested next steps' },
  { command: '"Translate to Hindi/Telugu"', description: 'Change language' },
  { command: '"Stop"', description: 'Stop speaking' },
  { command: '"Repeat"', description: 'Repeat last response' },
  { command: '"Help"', description: 'List all commands' },
];

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
    handleTranscript
  } = useVoiceCommands({
    aiAnalysis,
    extractedText,
    documentType,
    onSpeak,
    onStop,
    onTranslate,
    currentLanguage
  });

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

      {/* Status Badge */}
      {isListening && (
        <Badge variant="destructive" className="animate-pulse">
          🎤 Listening...
        </Badge>
      )}
      
      {isProcessing && (
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
            
            <p className="text-xs text-muted-foreground">
              Click the microphone and say any of these commands:
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {AVAILABLE_COMMANDS.map((cmd, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {cmd.command}
                  </code>
                  <span className="text-xs text-muted-foreground ml-2">
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
