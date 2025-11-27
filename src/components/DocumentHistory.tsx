import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Calendar, Trash2, Tag as TagIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import TagSelector from "./TagSelector";
import { Document, Tag, DocumentTag } from "@/integrations/supabase/types";

interface DocumentHistoryProps {
  documents: Document[];
  onDocumentSelect: (doc: Document) => void;
  onDocumentDelete: (id: string) => void;
  selectedDocumentId?: string;
}

const DocumentHistory = ({ 
  documents, 
  onDocumentSelect, 
  onDocumentDelete,
  selectedDocumentId 
}: DocumentHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [documentTagsMap, setDocumentTagsMap] = useState<Record<string, Tag[]>>({});

  useEffect(() => {
    fetchTags();
    fetchAllDocumentTags();
  }, [documents]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllTags((data as Tag[]) || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchAllDocumentTags = async () => {
    try {
      const { data, error } = await supabase
        .from("document_tags")
        .select("document_id, tag_id, tags(*)");

      if (error) throw error;

      const tagMap: Record<string, Tag[]> = {};
      (data as DocumentTag[])?.forEach((dt: DocumentTag) => {
        if (!tagMap[dt.document_id]) {
          tagMap[dt.document_id] = [];
        }
        if (dt.tags) {
          tagMap[dt.document_id].push(dt.tags);
        }
      });

      setDocumentTagsMap(tagMap);
    } catch (error) {
      console.error("Error fetching document tags:", error);
    }
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tagId => 
        documentTagsMap[doc.id]?.some(tag => tag.id === tagId)
      );

    return matchesSearch && matchesTags;
  });

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

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Document History
          </h3>
          <Badge variant="secondary">{documents.length} documents</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TagIcon className="h-4 w-4" />
              <span>Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id)
                      ? tag.color
                      : tag.color + "20",
                    color: selectedTags.includes(tag.id) ? "white" : tag.color,
                    borderColor: tag.color + "40",
                    cursor: "pointer",
                  }}
                  variant="outline"
                  onClick={() => toggleTagFilter(tag.id)}
                  className="transition-all hover:scale-105"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Document List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "No documents found" : "No documents yet"}
            </p>
          ) : (
            filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedDocumentId === doc.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onDocumentSelect(doc)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="font-medium truncate">{doc.file_name}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge 
                        className={getDocumentTypeColor(doc.document_type)} 
                        variant="outline"
                      >
                        {doc.document_type}
                      </Badge>
                      {doc.ai_analysis?.urgency && (
                        <Badge variant={getUrgencyColor(doc.ai_analysis.urgency)}>
                          {doc.ai_analysis.urgency} urgency
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </div>

                    {/* Document Tags */}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <TagSelector 
                        documentId={doc.id} 
                        onTagsChange={() => {
                          fetchAllDocumentTags();
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDocumentDelete(doc.id);
                    }}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};

export default DocumentHistory;
