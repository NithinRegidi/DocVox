import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FileText, Copy, Check, AlertCircle, CheckCircle2, Clock, Download, Share2, Volume2, VolumeX, Pause, Play, Calendar, DollarSign, Mail, Phone, Hash, User, FileCheck, Lightbulb, Target, Shield, MessageCircle, Send, Languages, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import { AIAnalysis } from "@/integrations/supabase/types";
import { useCloudTTS } from "@/lib/cloudTTS";
import LanguageSelector from "@/components/LanguageSelector";
import ReminderManager from "@/components/ReminderManager";
import TranslationSelector from "@/components/TranslationSelector";
import { translateText, translateAnalysis, getLanguageByCode, isTranslationAvailable, TranslatedAnalysis } from "@/lib/translation";

interface ExtractedTextDisplayProps {
  text: string;
  documentType: string;
  analysis?: AIAnalysis;
  fileName?: string;
  createdAt?: string;
  isSharedView?: boolean;
}

const ExtractedTextDisplay = ({ text, documentType, analysis, fileName, createdAt, isSharedView = false }: ExtractedTextDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const { speak, speakAnalysis, stop, pause, resume, isSpeaking, isPaused, isAvailable, selectedLanguage, setLanguage, availableLanguages } = useCloudTTS();

  // Translation state
  const [translationLanguage, setTranslationLanguage] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedAnalysis, setTranslatedAnalysis] = useState<TranslatedAnalysis | null>(null);
  const [translatedText, setTranslatedText] = useState<string>("");

  // Handle translation
  const handleTranslationChange = async (langCode: string) => {
    setTranslationLanguage(langCode);
    
    if (!langCode) {
      // Reset to original
      setTranslatedAnalysis(null);
      setTranslatedText("");
      return;
    }

    setIsTranslating(true);
    try {
      const targetLang = getLanguageByCode(langCode);
      
      // Translate analysis if available
      if (analysis) {
        const translated = await translateAnalysis({
          summary: analysis.summary,
          explanation: analysis.explanation,
          keyInformation: analysis.keyInformation,
          suggestedActions: analysis.suggestedActions,
          warnings: analysis.warnings,
          speakableSummary: analysis.speakableSummary,
        }, langCode);
        setTranslatedAnalysis(translated);
      }

      // Translate extracted text (limit to first 3000 chars for performance)
      if (text) {
        const textToTranslate = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
        const translated = await translateText(textToTranslate, langCode);
        setTranslatedText(translated);
      }

      toast({
        title: "Translation Complete",
        description: `Translated to ${targetLang?.name || langCode}`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Failed",
        description: "Could not translate. Please try again.",
        variant: "destructive",
      });
      setTranslationLanguage("");
    } finally {
      setIsTranslating(false);
    }
  };

  // Get displayed content (translated or original)
  const displayedAnalysis = translatedAnalysis && translationLanguage ? {
    ...analysis,
    summary: translatedAnalysis.summary || analysis?.summary,
    explanation: translatedAnalysis.explanation || analysis?.explanation,
    keyInformation: translatedAnalysis.keyInformation?.length ? translatedAnalysis.keyInformation : analysis?.keyInformation,
    suggestedActions: translatedAnalysis.suggestedActions?.length ? translatedAnalysis.suggestedActions : analysis?.suggestedActions,
    warnings: translatedAnalysis.warnings?.length ? translatedAnalysis.warnings : analysis?.warnings,
    speakableSummary: translatedAnalysis.speakableSummary || analysis?.speakableSummary,
  } : analysis;

  const displayedText = translatedText && translationLanguage ? translatedText : text;

  const handleSpeak = async () => {
    if (isSpeaking && !isPaused) {
      pause();
      return;
    }
    
    if (isPaused) {
      resume();
      return;
    }

    try {
      if (analysis) {
        await speakAnalysis({
          documentType: analysis.documentType,
          summary: analysis.summary,
          explanation: analysis.explanation,
          keyInformation: analysis.keyInformation,
          suggestedActions: analysis.suggestedActions,
          warnings: analysis.warnings,
          speakableSummary: analysis.speakableSummary,
        });
      } else {
        // Just read the extracted text if no analysis
        await speak(text.substring(0, 2000)); // Limit text length for speech
      }
    } catch (error) {
      console.error('TTS Error:', error);
      toast({
        title: "Speech Error",
        description: "Could not read the document aloud. Please check your API key or try again.",
        variant: "destructive",
      });
    }
  };

  const handleStopSpeaking = () => {
    stop();
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const documentId = analysis?.documentId;
      
      if (!documentId) {
        toast({
          title: "Error",
          description: "Cannot generate share link for this document",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-share-token', {
        body: { documentId }
      });

      if (error) throw error;

      const link = `${window.location.origin}/shared/${data.shareToken}`;
      setShareLink(link);

      toast({
        title: "Share Link Generated",
        description: "Anyone with this link can view the document",
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied successfully",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF({
        fileName: fileName || 'document',
        documentType,
        extractedText: text,
        analysis,
        createdAt,
      });
      toast({
        title: "PDF exported",
        description: "Analysis report has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not generate PDF report",
        variant: "destructive",
      });
    }
  };

  // Generate shareable summary text
  const generateShareText = (format: 'short' | 'full' = 'short') => {
    const docType = analysis?.documentType || documentType;
    const summary = analysis?.summary || '';
    const keyInfo = analysis?.keyInformation || [];
    const actions = analysis?.suggestedActions || [];
    const warnings = analysis?.warnings || [];
    const urgency = analysis?.urgency || 'low';

    if (format === 'short') {
      let text = `📄 *${docType}*\n\n`;
      text += `📋 *Summary:*\n${summary}\n`;
      if (urgency === 'high') {
        text += `\n🔴 *URGENT* - Requires immediate attention\n`;
      }
      if (keyInfo.length > 0) {
        text += `\n🔑 *Key Info:*\n${keyInfo.slice(0, 3).map(k => `• ${k}`).join('\n')}\n`;
      }
      if (warnings.length > 0) {
        text += `\n⚠️ *Warnings:*\n${warnings.slice(0, 2).map(w => `• ${w}`).join('\n')}\n`;
      }
      text += `\n_Analyzed by DocSpeak Aid_`;
      return text;
    }

    // Full format for email
    let text = `Document Analysis Report\n`;
    text += `========================\n\n`;
    text += `Document Type: ${docType}\n`;
    text += `Priority: ${urgency.toUpperCase()}\n\n`;
    text += `SUMMARY\n-------\n${summary}\n\n`;
    if (analysis?.explanation) {
      text += `EXPLANATION\n-----------\n${analysis.explanation}\n\n`;
    }
    if (keyInfo.length > 0) {
      text += `KEY INFORMATION\n---------------\n${keyInfo.map(k => `• ${k}`).join('\n')}\n\n`;
    }
    if (actions.length > 0) {
      text += `RECOMMENDED ACTIONS\n-------------------\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n`;
    }
    if (warnings.length > 0) {
      text += `⚠️ WARNINGS\n-----------\n${warnings.map(w => `• ${w}`).join('\n')}\n\n`;
    }
    text += `---\nAnalyzed by DocSpeak Aid`;
    return text;
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    const text = generateShareText('short');
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    toast({
      title: "Opening WhatsApp",
      description: "Share the document summary with your contacts",
    });
  };

  // Share via Email
  const handleEmailShare = () => {
    const docType = analysis?.documentType || documentType;
    const subject = encodeURIComponent(`Document Analysis: ${docType}`);
    const body = encodeURIComponent(generateShareText('full'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    toast({
      title: "Opening Email",
      description: "Compose an email with the document analysis",
    });
  };

  // Native Share API (for mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Document Analysis: ${analysis?.documentType || documentType}`,
          text: generateShareText('short'),
        });
        toast({
          title: "Shared",
          description: "Document summary shared successfully",
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          toast({
            title: "Share failed",
            description: "Could not share the document",
            variant: "destructive",
          });
        }
      }
    }
  };

  // Copy just the summary
  const handleCopySummary = async () => {
    try {
      const text = generateShareText('short');
      await navigator.clipboard.writeText(text);
      toast({
        title: "Summary Copied",
        description: "AI summary copied to clipboard - paste anywhere!",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy summary",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "Bank Letter": "bg-blue-500/10 text-blue-700 border-blue-500/20",
      "Legal Notice": "bg-red-500/10 text-red-700 border-red-500/20",
      "Government Form": "bg-green-500/10 text-green-700 border-green-500/20",
      "Academic Document": "bg-purple-500/10 text-purple-700 border-purple-500/20",
      "General Document": "bg-gray-500/10 text-gray-700 border-gray-500/20",
    };
    return colors[type] || colors["General Document"];
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Share Link Alert */}
      {shareLink && (
        <Alert>
          <Share2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <div className="flex-1 font-mono text-sm overflow-hidden text-ellipsis">
              {shareLink}
            </div>
            <Button
              onClick={handleCopyLink}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Analysis Card - Improved Design */}
      {analysis && (
        <Card className={`overflow-hidden border-2 shadow-lg ${
          analysis.analysisSource === 'gemini-ai' 
            ? 'border-green-300 bg-gradient-to-br from-green-50/30 to-transparent' 
            : 'border-amber-300 bg-gradient-to-br from-amber-50/30 to-transparent'
        }`}>
          {/* Header */}
          <div className={`p-4 border-b ${
            analysis.analysisSource === 'gemini-ai'
              ? 'bg-gradient-to-r from-green-100/50 via-green-50/30 to-transparent'
              : 'bg-gradient-to-r from-amber-100/50 via-amber-50/30 to-transparent'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  analysis.analysisSource === 'gemini-ai' 
                    ? 'bg-green-100' 
                    : 'bg-amber-100'
                }`}>
                  <FileCheck className={`h-6 w-6 ${
                    analysis.analysisSource === 'gemini-ai' 
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Document Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysis.analysisSource === 'gemini-ai' 
                      ? '🤖 AI Analysis (extracts real data)' 
                      : analysis.analysisSource === 'local'
                      ? '💻 Local Analysis (pattern-based)'
                      : 'Intelligent document insights'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Translation Badge */}
                {translationLanguage && (
                  <Badge 
                    variant="outline"
                    className="px-3 py-1 text-sm font-semibold bg-indigo-100 text-indigo-800 border-indigo-400 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-600"
                  >
                    <Languages className="h-3 w-3 mr-1" />
                    {getLanguageByCode(translationLanguage)?.name}
                  </Badge>
                )}
                {/* Analysis Source Badge */}
                {analysis.analysisSource && (
                  <Badge 
                    variant="outline"
                    className={`px-3 py-1 text-sm font-semibold ${
                      analysis.analysisSource === 'gemini-ai' 
                        ? 'bg-green-100 text-green-800 border-green-400' 
                        : 'bg-amber-100 text-amber-800 border-amber-400'
                    }`}
                  >
                    {analysis.analysisSource === 'gemini-ai' ? '🟢 AI' : '🟠 Offline'}
                  </Badge>
                )}
                <Badge 
                  variant={analysis.confidence === 'high' ? 'default' : 'secondary'}
                  className="px-3 py-1"
                >
                  {analysis.confidence === 'high' ? '✓' : analysis.confidence === 'medium' ? '~' : '?'} {analysis.confidence} confidence
                </Badge>
                {analysis.urgency === 'high' && (
                  <Badge variant="destructive" className="px-3 py-1 animate-pulse">
                    🔴 Urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Document Type & Category Row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border-blue-200">
                📄 {analysis.documentType || documentType}
              </Badge>
              {analysis.category && (
                <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-purple-50 text-purple-700 border-purple-200">
                  🏷️ {analysis.category}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={`px-3 py-1.5 text-sm font-medium ${
                  analysis.urgency === 'high' 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : analysis.urgency === 'medium'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                {analysis.urgency === 'high' ? '🔴' : analysis.urgency === 'medium' ? '🟡' : '🟢'} {analysis.urgency} priority
              </Badge>
            </div>

            {/* Summary Section */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 border">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-2">📋 Summary</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{displayedAnalysis?.summary}</p>
                </div>
              </div>
            </div>

            {/* Explanation Section */}
            {displayedAnalysis?.explanation && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg shrink-0">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base mb-2">💡 What This Means For You</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{displayedAnalysis.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Information Grid */}
            {displayedAnalysis?.keyInformation && displayedAnalysis.keyInformation.length > 0 && (
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Key Information Found
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayedAnalysis.keyInformation.map((info: string, idx: number) => {
                    // Determine icon based on content
                    const getInfoIcon = (text: string) => {
                      if (text.includes('📅') || text.toLowerCase().includes('date')) return <Calendar className="h-4 w-4 text-blue-500" />;
                      if (text.includes('💰') || text.toLowerCase().includes('amount') || text.includes('$')) return <DollarSign className="h-4 w-4 text-green-500" />;
                      if (text.includes('📧') || text.toLowerCase().includes('email') || text.includes('@')) return <Mail className="h-4 w-4 text-purple-500" />;
                      if (text.includes('📞') || text.toLowerCase().includes('phone')) return <Phone className="h-4 w-4 text-cyan-500" />;
                      if (text.includes('🔢') || text.toLowerCase().includes('reference') || text.toLowerCase().includes('number')) return <Hash className="h-4 w-4 text-orange-500" />;
                      if (text.includes('👤') || text.toLowerCase().includes('contact') || text.toLowerCase().includes('name')) return <User className="h-4 w-4 text-pink-500" />;
                      return <CheckCircle2 className="h-4 w-4 text-primary" />;
                    };
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="shrink-0 mt-0.5">
                          {getInfoIcon(info)}
                        </div>
                        <span className="text-sm font-medium">{info.replace(/^(📅|💰|📧|📞|🔢|👤|📌|📄)\s*/u, '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warnings Section */}
            {displayedAnalysis?.warnings && displayedAnalysis.warnings.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 rounded-xl p-4 border-2 border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-3 text-red-700 dark:text-red-400">⚠️ Important Alerts</h4>
                    <ul className="space-y-2">
                      {displayedAnalysis.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 font-bold shrink-0">!</span>
                          <span className="text-red-700 dark:text-red-300 font-medium">{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Steps */}
            {displayedAnalysis?.suggestedActions && displayedAnalysis.suggestedActions.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-3 text-emerald-700 dark:text-emerald-400">✅ Recommended Actions</h4>
                    <ol className="space-y-3">
                      {displayedAnalysis.suggestedActions.map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Reminders & Detected Deadlines */}
      {analysis && !isSharedView && (
        <Card className="p-4">
          <ReminderManager 
            documentId={analysis.documentId} 
            detectedDeadlines={analysis.detectedDeadlines}
          />
        </Card>
      )}

      {/* Document Type Badge and Actions */}
      <Card className="p-4 bg-card/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Document Type</p>
              <Badge className={getDocumentTypeColor(documentType)} variant="outline">
                {documentType}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Translation Selector */}
            <TranslationSelector
              selectedLanguage={translationLanguage}
              onLanguageChange={handleTranslationChange}
              disabled={isTranslating}
              isTranslating={isTranslating}
            />

            {/* Text-to-Speech Button - Cloud TTS */}
            {isAvailable && (
              <div className="flex gap-2 items-center">
                {/* Language Selector */}
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={setLanguage}
                  availableLanguages={availableLanguages}
                  disabled={isSpeaking}
                />
                <div className="flex gap-1">
                  <Button
                    onClick={handleSpeak}
                    variant={isSpeaking ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                  >
                    {isSpeaking && !isPaused ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : isPaused ? (
                      <>
                        <Play className="h-4 w-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        Listen
                      </>
                    )}
                  </Button>
                  {isSpeaking && (
                    <Button
                      onClick={handleStopSpeaking}
                      variant="outline"
                      size="sm"
                    >
                      <VolumeX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            {!isSharedView && (
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                disabled={isSharing}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                {isSharing ? "Generating..." : "Share Link"}
              </Button>
            )}
            {/* Quick Share Buttons */}
            {analysis && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppShare}
                  className="gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                  title="Share via WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmailShare}
                  className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                  title="Share via Email"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Email</span>
                </Button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNativeShare}
                    className="gap-2"
                    title="Share via other apps"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySummary}
                  className="gap-2"
                  title="Copy AI summary to clipboard"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy Summary</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Text
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Extracted Text */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Extracted Text
          {translationLanguage && (
            <Badge variant="outline" className="ml-2 text-xs">
              <Languages className="h-3 w-3 mr-1" />
              {getLanguageByCode(translationLanguage)?.name}
            </Badge>
          )}
        </h3>
        <div className="bg-muted/30 rounded-lg p-6 max-h-96 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayedText}</p>
        </div>
      </Card>
    </div>
  );
};

export default ExtractedTextDisplay;