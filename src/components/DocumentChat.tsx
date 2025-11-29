/**
 * Document Chat Assistant Component
 * Voice-enabled AI chat for document Q&A in multiple languages
 */

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Loader2,
  Languages,
  MessageSquare,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition, STT_LANGUAGES } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/lib/browserTTS";
import { AIAnalysis } from "@/integrations/supabase/types";
import { chatAboutDocumentMultiModel } from "@/lib/multiModelAI";

// Gemini API for chat (primary)
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  language?: string;
}

interface DocumentChatProps {
  documentText: string;
  documentType: string;
  analysis?: AIAnalysis;
  isOpen?: boolean;
  onClose?: () => void;
}

const DocumentChat = ({ 
  documentText, 
  documentType, 
  analysis, 
  isOpen: controlledIsOpen, 
  onClose: controlledOnClose 
}: DocumentChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };
  const handleOpen = () => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(true);
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage: setSpeechLanguage,
  } = useSpeechRecognition();

  // Text-to-Speech
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isAvailable: isTTSAvailable,
    setLanguage: setTTSLanguage,
  } = useBrowserTTS();

  // Update input when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get welcome message based on document
  const getWelcomeMessage = (): string => {
    if (analysis) {
      return `Hello! I've analyzed your ${documentType}. ${analysis.summary || ''}\n\nFeel free to ask me any questions about this document in your preferred language. You can type or use the microphone to speak.`;
    }
    return `Hello! I'm ready to help you understand this ${documentType}. Ask me anything about the document - you can type or speak in your language!`;
  };

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setSpeechLanguage(lang);
    setTTSLanguage(lang);
  };

  // Start/stop voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening({ language: selectedLanguage });
    }
  };

  // Send message to Gemini AI
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      language: selectedLanguage,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    resetTranscript();
    setIsLoading(true);

    try {
      const response = await chatWithGemini(text, selectedLanguage);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        language: selectedLanguage,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if enabled
      if (autoSpeak && isTTSAvailable) {
        await speak(response, selectedLanguage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Chat with AI about the document (with multi-model fallback)
  const chatWithGemini = async (userQuestion: string, language: string): Promise<string> => {
    const languageName = STT_LANGUAGES.find(l => l.code === language)?.name || 'English';

    // First try Gemini directly
    if (GEMINI_API_KEY) {
      try {
        const systemPrompt = `You are a helpful document assistant. You help users understand documents in their preferred language.

DOCUMENT CONTEXT:
- Document Type: ${documentType}
- Document Content: ${documentText.substring(0, 8000)}
${analysis ? `
- AI Analysis Summary: ${analysis.summary}
- Key Information: ${analysis.keyInformation?.join(', ') || 'N/A'}
- Warnings: ${analysis.warnings?.join(', ') || 'None'}
- Suggested Actions: ${analysis.suggestedActions?.join(', ') || 'N/A'}
` : ''}

INSTRUCTIONS:
1. Answer the user's question about this specific document
2. Respond in ${languageName} language (the user asked in ${languageName})
3. Be helpful, clear, and concise
4. If asking about deadlines, amounts, or important info, give EXACT values from the document
5. If the question is not about the document, politely redirect to document-related topics
6. Use simple language that anyone can understand
7. If you don't know something, say so honestly

USER QUESTION: ${userQuestion}

Respond naturally in ${languageName}:`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log('✅ Chat: Gemini responded');
            return text;
          }
        }
        console.log('⚠️ Chat: Gemini failed, trying fallback...');
      } catch (error) {
        console.log('⚠️ Chat: Gemini error, trying fallback...', error);
      }
    }

    // Fallback to multi-model (GPT-4o, Llama 3.1)
    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await chatAboutDocumentMultiModel(
        userQuestion,
        documentText,
        documentType,
        chatHistory,
        languageName
      );

      console.log(`✅ Chat: ${result.model} responded`);
      return result.answer;
    } catch (fallbackError) {
      console.error('❌ All chat models failed:', fallbackError);
      throw new Error('Failed to get response from any AI model');
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Speak a message
  const speakMessage = async (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      await speak(text, selectedLanguage);
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
        size="icon"
        title="Open Document Chat Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 shadow-2xl border-2 transition-all duration-300 ${
      isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Document Assistant</h3>
            {!isMinimized && (
              <p className="text-xs text-muted-foreground">Ask anything about your document</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Language Selector */}
          <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STT_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-xs">
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name} ({lang.nativeName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={autoSpeak ? "default" : "outline"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setAutoSpeak(!autoSpeak)}
              title={autoSpeak ? "Auto-speak enabled" : "Auto-speak disabled"}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 h-[380px] p-3">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="p-1.5 bg-primary/10 rounded-full h-fit">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'assistant' && isTTSAvailable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => speakMessage(message.content)}
                        >
                          {isSpeaking ? (
                            <VolumeX className="h-3 w-3" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="p-1.5 bg-primary rounded-full h-fit">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="p-1.5 bg-primary/10 rounded-full h-fit">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            {/* Show interim transcript while speaking */}
            {(interimTranscript || isListening) && (
              <div className="mb-2 p-2 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                  <span>{interimTranscript || 'Listening...'}</span>
                </div>
              </div>
            )}
            
            {speechError && (
              <div className="mb-2 p-2 bg-destructive/10 rounded-lg text-xs text-destructive">
                {speechError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type or speak your question..."
                disabled={isLoading}
                className="flex-1 text-sm"
              />
              
              {isSpeechSupported && (
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleVoiceInput}
                  disabled={isLoading}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <Button
                type="submit"
                size="icon"
                disabled={!inputText.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
};

export default DocumentChat;
