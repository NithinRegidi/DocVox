import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image as ImageIcon, Loader2, Camera } from "lucide-react";
import { processDocument } from "@/lib/documentProcessor";
import { detectDocumentType } from "@/lib/documentTypeDetector";
import { analyzeDocumentHybrid } from "@/lib/hybridAnalyzer";
import { AIAnalysis } from "@/integrations/supabase/types";
import { Session } from "@supabase/supabase-js";
import CameraCapture from "@/components/CameraCapture";

interface DocumentUploadProps {
  onTextExtracted: (text: string, documentType: string, analysis?: AIAnalysis) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

interface FileProgress {
  name: string;
  progress: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

const DocumentUpload = ({ onTextExtracted, isProcessing, setIsProcessing }: DocumentUploadProps) => {
  const [filesProgress, setFilesProgress] = useState<FileProgress[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const { toast } = useToast();
  const filesProgressLengthRef = useRef(0);

  const processFile = useCallback(async (file: File, session: Session, fileIndex: number) => {
    const updateProgress = (progress: number, status: 'processing' | 'completed' | 'error' = 'processing') => {
      setFilesProgress(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress, status } : f
      ));
    };

    try {
      const userId = session.user.id;
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      updateProgress(20);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      updateProgress(40);

      // Process document (OCR)
      const extractedText = await processDocument(file, (p) => {
        updateProgress(40 + p * 0.4); // 40-80% for OCR
      });

      updateProgress(70);

      // Detect document type
      const basicType = detectDocumentType(extractedText);

      updateProgress(75);

      // Analyze document using hybrid approach (Gemini AI first, local fallback)
      let analysis = null;
      let documentType = basicType;
      
      try {
        console.log("Starting hybrid document analysis...");
        const hybridAnalysis = await analyzeDocumentHybrid(extractedText, basicType, 'auto');
        
        analysis = {
          documentType: hybridAnalysis.documentType,
          confidence: hybridAnalysis.confidence,
          summary: hybridAnalysis.summary,
          keyInformation: hybridAnalysis.keyInformation,
          suggestedActions: hybridAnalysis.suggestedActions,
          explanation: hybridAnalysis.explanation,
          warnings: hybridAnalysis.warnings,
          speakableSummary: hybridAnalysis.speakableSummary,
          urgency: hybridAnalysis.urgency,
          category: hybridAnalysis.category,
          analysisSource: hybridAnalysis.analysisSource,
        };
        documentType = hybridAnalysis.documentType;
        
        console.log(`Analysis completed (source: ${hybridAnalysis.analysisSource}):`, analysis.documentType);
      } catch (error) {
        console.error("Analysis failed:", error);
        // Use basic type if analysis fails
        analysis = {
          documentType: basicType,
          confidence: 'low' as const,
          summary: 'Document uploaded successfully. Analysis unavailable.',
          keyInformation: [],
          suggestedActions: ['Review the document manually'],
          explanation: 'Automatic analysis could not be performed.',
          warnings: [],
          speakableSummary: 'Document uploaded. Please review manually.',
          urgency: 'low' as const,
          category: 'General',
        };
      }

      updateProgress(90);

      // Save to database
      const { data, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          document_type: documentType,
          extracted_text: extractedText,
          processing_status: "completed",
          ai_analysis: analysis,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to save document: ${dbError.message}`);
      }

      updateProgress(100, 'completed');

      // Call onTextExtracted for the last file only
      if (fileIndex === filesProgressLengthRef.current - 1) {
        onTextExtracted(extractedText, documentType, { ...analysis, documentId: data.id });
      }

      return true;
    } catch (error) {
      console.error("Error processing document:", error);
      updateProgress(0, 'error');
      
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("Unsupported file type")) {
          errorMessage = "This file type is not supported. Please upload PDF or image files.";
        } else if (error.message.includes("storage") || error.message.includes("upload")) {
          errorMessage = "Failed to upload file. Please check your connection and try again.";
        } else if (error.message.includes("database") || error.message.includes("save")) {
          errorMessage = "Failed to save document. Please try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setFilesProgress(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, error: errorMessage } : f
      ));
      return false;
    }
  }, [onTextExtracted]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsProcessing(true);
      filesProgressLengthRef.current = acceptedFiles.length;
      setFilesProgress(acceptedFiles.map(f => ({ 
        name: f.name, 
        progress: 0, 
        status: 'processing' as const 
      })));

      try {
        // Get user session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Authentication required",
            description: "Please sign in to upload documents",
            variant: "destructive",
          });
          setIsProcessing(false);
          setFilesProgress([]);
          return;
        }

        // Process files sequentially
        let successCount = 0;
        for (let i = 0; i < acceptedFiles.length; i++) {
          const success = await processFile(acceptedFiles[i], session, i);
          if (success) successCount++;
        }

        toast({
          title: "Batch processing complete",
          description: `${successCount} of ${acceptedFiles.length} documents processed successfully`,
        });

      } catch (error) {
        console.error("Error in batch processing:", error);
        toast({
          title: "Error processing documents",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setFilesProgress([]);
        }, 2000);
      }
    },
    [processFile, setIsProcessing, toast]
  );

  // Handle camera capture - process captured image like a dropped file
  const handleCameraCapture = useCallback((file: File) => {
    setCameraOpen(false);
    onDrop([file]);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
      "text/rtf": [".rtf"],
      "application/rtf": [".rtf"],
    },
    maxFiles: 10,
    disabled: isProcessing,
  });

  return (
    <Card className="p-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <div className="w-full max-w-md space-y-3">
                <p className="text-sm font-medium text-center">
                  Processing {filesProgress.length} document{filesProgress.length > 1 ? 's' : ''}
                </p>
                {filesProgress.map((file, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[250px]">{file.name}</span>
                      <span className={`font-medium ${
                        file.status === 'completed' ? 'text-green-500' : 
                        file.status === 'error' ? 'text-destructive' : 
                        'text-muted-foreground'
                      }`}>
                        {file.status === 'completed' ? '✓ Done' : 
                         file.status === 'error' ? '✗ Failed' : 
                         `${Math.round(file.progress)}%`}
                      </span>
                    </div>
                    <Progress value={file.progress} className="h-1.5" />
                    {file.error && (
                      <p className="text-xs text-destructive">{file.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-4">
                <FileText className="h-12 w-12 text-primary" />
                <ImageIcon className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {isDragActive ? "Drop your documents here" : "Upload Documents"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word (DOC, DOCX), Images (PNG, JPG, WEBP), Text (TXT) • Up to 10 files
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCameraOpen(true);
                  }}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Scan Document
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCapture}
        isProcessing={isProcessing}
      />
    </Card>
  );
};

export default DocumentUpload;
