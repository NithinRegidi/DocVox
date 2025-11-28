import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Sparkles, 
  X, 
  FileText, 
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  Loader2,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { Document, AIAnalysis } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";

interface SmartSearchProps {
  documents: Document[];
  onDocumentSelect: (doc: Document) => void;
  onClose?: () => void;
}

// Example queries to help users
const EXAMPLE_QUERIES = [
  "Find all pending payments",
  "Show urgent documents",
  "Documents from last week",
  "Bank letters with deadlines",
  "High priority items",
  "Documents with warnings",
];

// Parse natural language query to filter criteria
interface SearchCriteria {
  keywords: string[];
  urgency?: 'high' | 'medium' | 'low';
  hasPayments?: boolean;
  hasDeadlines?: boolean;
  hasWarnings?: boolean;
  documentTypes?: string[];
  dateRange?: { days: number };
  category?: string;
}

function parseNaturalQuery(query: string): SearchCriteria {
  const q = query.toLowerCase();
  const criteria: SearchCriteria = { keywords: [] };

  // Extract urgency
  if (q.includes('urgent') || q.includes('high priority') || q.includes('important')) {
    criteria.urgency = 'high';
  } else if (q.includes('medium priority')) {
    criteria.urgency = 'medium';
  } else if (q.includes('low priority')) {
    criteria.urgency = 'low';
  }

  // Check for payment-related queries
  if (q.includes('payment') || q.includes('bill') || q.includes('invoice') || 
      q.includes('due') || q.includes('pay') || q.includes('amount')) {
    criteria.hasPayments = true;
  }

  // Check for deadline-related queries
  if (q.includes('deadline') || q.includes('expir') || q.includes('renew') || 
      q.includes('due date') || q.includes('appointment')) {
    criteria.hasDeadlines = true;
  }

  // Check for warnings
  if (q.includes('warning') || q.includes('alert') || q.includes('attention')) {
    criteria.hasWarnings = true;
  }

  // Date range extraction
  if (q.includes('today')) {
    criteria.dateRange = { days: 1 };
  } else if (q.includes('yesterday')) {
    criteria.dateRange = { days: 2 };
  } else if (q.includes('this week') || q.includes('last week') || q.includes('past week')) {
    criteria.dateRange = { days: 7 };
  } else if (q.includes('this month') || q.includes('last month') || q.includes('past month')) {
    criteria.dateRange = { days: 30 };
  } else if (q.includes('last 3 months') || q.includes('past 3 months')) {
    criteria.dateRange = { days: 90 };
  }

  // Document types
  const typeKeywords: Record<string, string[]> = {
    'Bank Letter': ['bank', 'banking', 'account', 'statement'],
    'Legal Notice': ['legal', 'notice', 'court', 'lawyer', 'law'],
    'Government Form': ['government', 'tax', 'official', 'form'],
    'Academic Document': ['academic', 'school', 'college', 'university', 'education'],
    'Medical': ['medical', 'health', 'hospital', 'doctor', 'prescription'],
    'Insurance': ['insurance', 'policy', 'claim', 'coverage'],
  };

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(kw => q.includes(kw))) {
      if (!criteria.documentTypes) criteria.documentTypes = [];
      criteria.documentTypes.push(type);
    }
  }

  // Extract remaining keywords (excluding common words)
  const stopWords = ['find', 'show', 'get', 'all', 'my', 'the', 'with', 'from', 'and', 'or', 'in', 'to', 'a', 'an', 'is', 'are', 'was', 'were', 'documents', 'document', 'files', 'file'];
  const words = q.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
  criteria.keywords = words;

  return criteria;
}

// Score a document based on search criteria
function scoreDocument(doc: Document, criteria: SearchCriteria): number {
  let score = 0;
  const analysis = doc.ai_analysis as AIAnalysis | null;

  // Urgency match
  if (criteria.urgency && analysis?.urgency === criteria.urgency) {
    score += 30;
  }

  // Payment detection
  if (criteria.hasPayments) {
    const hasPaymentDeadline = analysis?.detectedDeadlines?.some(d => d.type === 'payment');
    const paymentKeywords = ['payment', 'bill', 'invoice', 'amount', 'due', 'pay', '₹', '$', 'rs'];
    const textHasPayment = paymentKeywords.some(kw => 
      doc.extracted_text?.toLowerCase().includes(kw) ||
      analysis?.summary?.toLowerCase().includes(kw) ||
      analysis?.keyInformation?.some(k => k.toLowerCase().includes(kw))
    );
    if (hasPaymentDeadline || textHasPayment) score += 25;
  }

  // Deadline detection
  if (criteria.hasDeadlines) {
    const hasDeadlines = analysis?.detectedDeadlines && analysis.detectedDeadlines.length > 0;
    const deadlineKeywords = ['deadline', 'due', 'expiry', 'renewal', 'before', 'by'];
    const textHasDeadline = deadlineKeywords.some(kw =>
      analysis?.keyInformation?.some(k => k.toLowerCase().includes(kw)) ||
      analysis?.warnings?.some(w => w.toLowerCase().includes(kw))
    );
    if (hasDeadlines || textHasDeadline) score += 25;
  }

  // Warning detection
  if (criteria.hasWarnings) {
    if (analysis?.warnings && analysis.warnings.length > 0) {
      score += 20;
    }
  }

  // Document type match
  if (criteria.documentTypes && criteria.documentTypes.length > 0) {
    const docType = analysis?.documentType || doc.document_type || '';
    if (criteria.documentTypes.some(t => docType.toLowerCase().includes(t.toLowerCase()))) {
      score += 20;
    }
  }

  // Date range
  if (criteria.dateRange) {
    const docDate = new Date(doc.created_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - criteria.dateRange.days);
    if (docDate >= cutoffDate) {
      score += 15;
    }
  }

  // Keyword matches
  for (const keyword of criteria.keywords) {
    const searchableText = [
      doc.file_name,
      doc.document_type,
      analysis?.documentType,
      analysis?.summary,
      analysis?.explanation,
      ...(analysis?.keyInformation || []),
      ...(analysis?.warnings || []),
      ...(analysis?.suggestedActions || []),
      doc.extracted_text?.substring(0, 500),
    ].filter(Boolean).join(' ').toLowerCase();

    if (searchableText.includes(keyword)) {
      score += 10;
    }
  }

  // Boost high urgency documents
  if (analysis?.urgency === 'high') {
    score += 5;
  }

  return score;
}

const SmartSearch = ({ documents, onDocumentSelect, onClose }: SmartSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchInsight, setSearchInsight] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const performSearch = useCallback(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchPerformed(false);
      setSearchInsight("");
      return;
    }

    setIsSearching(true);
    setSearchPerformed(true);

    // Simulate a brief delay for better UX
    setTimeout(() => {
      const criteria = parseNaturalQuery(query);
      
      // Score and filter documents
      const scoredDocs = documents
        .map(doc => ({ doc, score: scoreDocument(doc, criteria) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);

      setResults(scoredDocs.map(({ doc }) => doc));

      // Generate search insight
      const insights: string[] = [];
      if (criteria.urgency) insights.push(`urgency: ${criteria.urgency}`);
      if (criteria.hasPayments) insights.push('payment-related');
      if (criteria.hasDeadlines) insights.push('with deadlines');
      if (criteria.hasWarnings) insights.push('with warnings');
      if (criteria.documentTypes?.length) insights.push(`type: ${criteria.documentTypes.join(', ')}`);
      if (criteria.dateRange) insights.push(`last ${criteria.dateRange.days} days`);
      
      setSearchInsight(insights.length > 0 
        ? `Filtering by: ${insights.join(' • ')}` 
        : 'Searching by keywords');

      setIsSearching(false);
    }, 300);
  }, [query, documents]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  const getDocumentIcon = (doc: Document) => {
    const analysis = doc.ai_analysis as AIAnalysis | null;
    if (analysis?.urgency === 'high') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (analysis?.detectedDeadlines?.length) return <Calendar className="h-4 w-4 text-blue-500" />;
    if (analysis?.detectedDeadlines?.some(d => d.type === 'payment')) return <DollarSign className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getUrgencyBadge = (urgency?: string) => {
    if (!urgency) return null;
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200',
    };
    return (
      <Badge variant="outline" className={colors[urgency] || ''}>
        {urgency}
      </Badge>
    );
  };

  return (
    <Card className="p-4 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Smart Search</h3>
            <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Try: 'Find pending payments' or 'Urgent documents this week'"
              className="pl-10 pr-4"
            />
          </div>
          <Button onClick={performSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Example Queries */}
        {!searchPerformed && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setQuery(example);
                    setTimeout(performSearch, 100);
                  }}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search Insight */}
        {searchInsight && (
          <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
            🔍 {searchInsight}
          </p>
        )}

        {/* Results */}
        {searchPerformed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {results.length} {results.length === 1 ? 'result' : 'results'} found
              </p>
              {results.length > 0 && (
                <p className="text-xs text-muted-foreground">Click to view</p>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No documents match your search</p>
                <p className="text-xs mt-1">Try different keywords or browse all documents</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {results.map((doc) => {
                  const analysis = doc.ai_analysis as AIAnalysis | null;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onDocumentSelect(doc)}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getDocumentIcon(doc)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {analysis?.summary?.substring(0, 80) || 'No summary available'}...
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-xs">
                                {analysis?.documentType || doc.document_type || 'Document'}
                              </Badge>
                              {getUrgencyBadge(analysis?.urgency)}
                              {analysis?.detectedDeadlines && analysis.detectedDeadlines.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {analysis.detectedDeadlines.length} deadline{analysis.detectedDeadlines.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                          </span>
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SmartSearch;
