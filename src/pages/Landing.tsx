import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Scan, Brain, Volume2, CheckCircle, Sparkles, LogIn, LayoutDashboard, Camera, Languages, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: <Scan className="h-8 w-8 text-primary" />,
      title: "Smart OCR Technology",
      description: "Extract text from PDFs and images with advanced OCR processing"
    },
    {
      icon: <Camera className="h-8 w-8 text-primary" />,
      title: "Camera Scan",
      description: "Capture documents directly from your camera for instant processing"
    },
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "AI Summarization",
      description: "Get intelligent summaries of your documents powered by AI"
    },
    {
      icon: <Languages className="h-8 w-8 text-primary" />,
      title: "Multi-Language Translation",
      description: "Translate documents into 22+ languages including Indian regional languages"
    },
    {
      icon: <Volume2 className="h-8 w-8 text-primary" />,
      title: "Regional Audio Guide",
      description: "Listen to your documents in multiple regional languages"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Voice Chat Assistant",
      description: "Ask questions about your documents in your language - Telugu, Tamil, Hindi, or English"
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: "Document Detection",
      description: "Automatically identify document types and key information"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Document Assistant</span>
          </div>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button onClick={() => navigate("/app")} className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
                <Button onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            AI-Powered Document Processing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Transform Your Documents with
            <span className="text-primary"> AI Intelligence</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload, extract, summarize, and listen to your documents in your preferred language. 
            Powered by advanced OCR and AI technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            {isLoggedIn ? (
              <>
                <Button size="lg" onClick={() => navigate("/app")} className="text-lg px-8 gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Go to Dashboard
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/app")} className="text-lg px-8">
                  Upload Documents
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
                  Start Processing Documents
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
                  Create Free Account
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need for Document Processing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our platform combines cutting-edge AI technology with intuitive design 
            to make document management effortless.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-r from-primary/5 to-primary/10 rounded-3xl my-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">Three simple steps to process your documents</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
              1
            </div>
            <h3 className="text-xl font-semibold">Upload Document</h3>
            <p className="text-muted-foreground">
              Upload your PDF or image document to our secure platform
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
              2
            </div>
            <h3 className="text-xl font-semibold">AI Processing</h3>
            <p className="text-muted-foreground">
              Our AI extracts, analyzes, and summarizes the content automatically
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
              3
            </div>
            <h3 className="text-xl font-semibold">Get Results</h3>
            <p className="text-muted-foreground">
              Read summaries or listen to audio versions in your language
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-to-r from-primary/20 to-primary/10 border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isLoggedIn ? "Continue Where You Left Off" : "Ready to Get Started?"}
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            {isLoggedIn 
              ? "Your documents are waiting. Jump back into your dashboard and keep working."
              : "Join thousands of users who are already processing their documents smarter and faster."
            }
          </p>
          <Button size="lg" onClick={() => navigate(isLoggedIn ? "/app" : "/auth")} className="text-lg px-8">
            {isLoggedIn ? "Go to Dashboard" : "Create Free Account"}
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Document Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
