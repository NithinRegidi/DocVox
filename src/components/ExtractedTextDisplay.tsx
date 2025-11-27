import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FileText, Copy, Check, AlertCircle, CheckCircle2, Clock, Download, Share2, Volume2, VolumeX, Pause, Play, Calendar, DollarSign, Mail, Phone, Hash, User, FileCheck, Lightbulb, Target, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import { AIAnalysis } from "@/integrations/supabase/types";
import { useTextToSpeech } from "@/lib/textToSpeech";

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
  const { speak, speakAnalysis, stop, pause, resume, isSpeaking, isPaused, isSupported } = useTextToSpeech();

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
      toast({
        title: "Speech Error",
        description: "Could not read the document aloud. Please try again.",
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
                  <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Explanation Section */}
            {analysis.explanation && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg shrink-0">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base mb-2">💡 What This Means For You</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{analysis.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Information Grid */}
            {analysis.keyInformation && analysis.keyInformation.length > 0 && (
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Key Information Found
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.keyInformation.map((info: string, idx: number) => {
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
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 rounded-xl p-4 border-2 border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-3 text-red-700 dark:text-red-400">⚠️ Important Alerts</h4>
                    <ul className="space-y-2">
                      {analysis.warnings.map((warning: string, idx: number) => (
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
            {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-3 text-emerald-700 dark:text-emerald-400">✅ Recommended Actions</h4>
                    <ol className="space-y-3">
                      {analysis.suggestedActions.map((action: string, idx: number) => (
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
            {/* Text-to-Speech Button */}
            {isSupported && (
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
                {isSharing ? "Generating..." : "Share"}
              </Button>
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
        </h3>
        <div className="bg-muted/30 rounded-lg p-6 max-h-96 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        </div>
      </Card>
    </div>
  );
};

export default ExtractedTextDisplay;