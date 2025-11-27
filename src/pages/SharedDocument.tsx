import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import ExtractedTextDisplay from "@/components/ExtractedTextDisplay";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/integrations/supabase/types";

const SharedDocument = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<Document | null>(null);

  useEffect(() => {
    const fetchSharedDocument = async () => {
      if (!token) {
        toast({
          title: "Invalid Link",
          description: "This share link is not valid",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('share_token', token)
          .eq('shared', true)
          .single();

        if (error || !data) {
          toast({
            title: "Document Not Found",
            description: "This document may have been unshared or deleted",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setDocument(data as Document);
      } catch (error) {
        console.error('Error fetching shared document:', error);
        toast({
          title: "Error",
          description: "Failed to load shared document",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSharedDocument();
  }, [token, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This document may have been unshared or deleted.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Shared Document</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to App
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <h2 className="text-2xl font-bold mb-2">Shared Document Analysis</h2>
            <p className="text-muted-foreground">
              This document has been shared with you. View the extracted text and AI analysis below.
            </p>
          </Card>

          <ExtractedTextDisplay
            text={document.extracted_text}
            documentType={document.document_type}
            analysis={document.ai_analysis}
            fileName={document.file_name}
            createdAt={document.created_at}
            isSharedView={true}
          />
        </div>
      </main>
    </div>
  );
};

export default SharedDocument;