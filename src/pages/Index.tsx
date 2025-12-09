import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DocumentUpload from "@/components/DocumentUpload";
import ExtractedTextDisplay from "@/components/ExtractedTextDisplay";
import DocumentHistory from "@/components/DocumentHistory";
import Dashboard from "@/components/Dashboard";
import TagManager from "@/components/TagManager";
import SmartSearch from "@/components/SmartSearch";
import ReminderManager from "@/components/ReminderManager";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, LogOut, History, BarChart3, Home, LayoutDashboard, Search, Bell } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Document, AIAnalysis } from "@/integrations/supabase/types";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("");
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (!session) {
        // Redirect to Home page if not logged in
        navigate("/");
      } else {
        fetchDocuments();
      }
    };
    
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        // Redirect to Home page if not logged in
        navigate("/");
      } else {
        fetchDocuments();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as unknown as Document[]) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleTextExtracted = (text: string, docType: string, aiAnalysis?: AIAnalysis) => {
    setExtractedText(text);
    setDocumentType(docType);
    setAnalysis(aiAnalysis || null);
    setSelectedDocumentId(undefined);
    setSelectedDocument(null);
    fetchDocuments();
  };

  const handleDocumentSelect = (doc: Document) => {
    setExtractedText(doc.extracted_text || "");
    setDocumentType(doc.document_type || "");
    setAnalysis(doc.ai_analysis);
    setSelectedDocumentId(doc.id);
    setSelectedDocument(doc);
    setShowHistory(false);
  };

  const handleDocumentDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: "Document has been removed successfully",
      });

      fetchDocuments();
      
      if (selectedDocumentId === id) {
        setExtractedText("");
        setDocumentType("");
        setAnalysis(null);
        setSelectedDocumentId(undefined);
        setSelectedDocument(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Document Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button 
              variant={!showDashboard && !showHistory && !showSearch && !showReminders ? "default" : "ghost"} 
              size="sm" 
              onClick={() => {
                setShowDashboard(false);
                setShowHistory(false);
                setShowSearch(false);
                setShowReminders(false);
              }}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <TagManager />
            <Button 
              variant={showSearch ? "default" : "ghost"}
              size="sm" 
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) {
                  setShowDashboard(false);
                  setShowHistory(false);
                  setShowReminders(false);
                }
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              Smart Search
            </Button>
            <Button 
              variant={showReminders ? "default" : "ghost"}
              size="sm" 
              onClick={() => {
                setShowReminders(!showReminders);
                if (!showReminders) {
                  setShowDashboard(false);
                  setShowHistory(false);
                  setShowSearch(false);
                }
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Reminders
            </Button>
            <Button 
              variant={showDashboard ? "default" : "ghost"} 
              size="sm" 
              onClick={() => {
                setShowDashboard(!showDashboard);
                setShowHistory(false);
                setShowSearch(false);
                setShowReminders(false);
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button 
              variant={showHistory ? "default" : "ghost"} 
              size="sm" 
              onClick={() => {
                setShowHistory(!showHistory);
                setShowDashboard(false);
                setShowSearch(false);
                setShowReminders(false);
              }}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Section - Hide when viewing History or Analytics or Search or Reminders */}
          {!showHistory && !showDashboard && !showSearch && !showReminders && (
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <h2 className="text-2xl font-bold mb-2">Welcome to Document Assistant</h2>
              <p className="text-muted-foreground">
                Upload your documents (PDFs or images) and we'll extract the text, 
                identify the document type, and help you understand what actions to take.
              </p>
            </Card>
          )}

          {/* Smart Search Section */}
          {showSearch && documents.length > 0 && (
            <SmartSearch
              documents={documents}
              onDocumentSelect={(doc) => {
                handleDocumentSelect(doc);
                setShowSearch(false);
              }}
              onClose={() => setShowSearch(false)}
            />
          )}

          {/* Reminders Section */}
          {showReminders && (
            <ReminderManager />
          )}

          {/* Dashboard Section */}
          {showDashboard && documents.length > 0 && (
            <Dashboard documents={documents} />
          )}

          {/* Upload Section - Hide when viewing History or Analytics or Search or Reminders */}
          {!showDashboard && !showHistory && !showSearch && !showReminders && (
            <DocumentUpload
              onTextExtracted={handleTextExtracted}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          )}

          {/* History Section */}
          {showHistory && documents.length > 0 && !showDashboard && (
            <DocumentHistory
              documents={documents}
              onDocumentSelect={handleDocumentSelect}
              onDocumentDelete={handleDocumentDelete}
              selectedDocumentId={selectedDocumentId}
              onDocumentsChange={fetchDocuments}
            />
          )}

          {/* Results Section */}
          {extractedText && !showDashboard && !showHistory && !showSearch && !showReminders && (
            <ExtractedTextDisplay
              text={extractedText}
              documentType={documentType}
              analysis={analysis}
              fileName={selectedDocument?.file_name}
              createdAt={selectedDocument?.created_at}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
