import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Search, 
  Calendar, 
  Trash2, 
  Tag as TagIcon, 
  Folder,
  FolderOpen,
  ChevronRight,
  GripVertical,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import TagSelector from "./TagSelector";
import FolderManager, { FOLDER_ICONS } from "./FolderManager";
import { Document, Tag, DocumentTag, Folder as FolderType } from "@/integrations/supabase/types";

interface DocumentHistoryProps {
  documents: Document[];
  onDocumentSelect: (doc: Document) => void;
  onDocumentDelete: (id: string) => void;
  selectedDocumentId?: string;
  onDocumentsChange?: () => void;
}

const DocumentHistory = ({ 
  documents, 
  onDocumentSelect, 
  onDocumentDelete,
  selectedDocumentId,
  onDocumentsChange
}: DocumentHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allFolders, setAllFolders] = useState<FolderType[]>([]);
  const [documentTagsMap, setDocumentTagsMap] = useState<Record<string, Tag[]>>({});
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
    fetchFolders();
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

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllFolders((data as FolderType[]) || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
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

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedDocId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    
    if (!draggedDocId) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ folder_id: folderId })
        .eq('id', draggedDocId);

      if (error) throw error;

      const folderName = folderId 
        ? allFolders.find(f => f.id === folderId)?.name 
        : 'No Folder';

      toast({
        title: "Document moved",
        description: `Moved to ${folderName}`,
      });

      onDocumentsChange?.();
    } catch (error) {
      console.error('Error moving document:', error);
      toast({
        title: "Error",
        description: "Failed to move document",
        variant: "destructive",
      });
    }

    setDraggedDocId(null);
    setDragOverFolderId(null);
  };

  // Apply auto-suggested tags
  const applyAutoTags = async (docId: string, suggestedTags: string[]) => {
    try {
      // Find or create tags that match suggestions
      for (const tagName of suggestedTags) {
        // Check if tag exists
        let tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        
        if (!tag) {
          // Create the tag
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          const { data: newTag, error: createError } = await supabase
            .from('tags')
            .insert({ user_id: user.id, name: tagName, color: '#6b7280' })
            .select()
            .single();

          if (createError) continue;
          tag = newTag;
          setAllTags(prev => [...prev, newTag]);
        }

        // Link tag to document
        if (tag) {
          await supabase
            .from('document_tags')
            .upsert({ document_id: docId, tag_id: tag.id }, { onConflict: 'document_id,tag_id' });
        }
      }

      toast({
        title: "Tags applied",
        description: `Applied ${suggestedTags.length} suggested tags`,
      });

      fetchAllDocumentTags();
    } catch (error) {
      console.error('Error applying auto tags:', error);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.document_type?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tagId => 
        documentTagsMap[doc.id]?.some(tag => tag.id === tagId)
      );

    const matchesFolder = selectedFolderId === null || doc.folder_id === selectedFolderId;

    return matchesSearch && matchesTags && matchesFolder;
  });

  // Group documents by folder for display
  const unfolderedDocs = filteredDocuments.filter(d => !d.folder_id);
  const folderDocCounts = allFolders.reduce((acc, folder) => {
    acc[folder.id] = documents.filter(d => d.folder_id === folder.id).length;
    return acc;
  }, {} as Record<string, number>);

  const getDocumentTypeColor = (type: string | null) => {
    if (!type) return "bg-gray-500/10 text-gray-700 border-gray-500/20";
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

  const getFolderIcon = (iconName: string) => {
    return FOLDER_ICONS[iconName] || Folder;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Document History
          </h3>
          <div className="flex items-center gap-2">
            <FolderManager />
            <Badge variant="secondary">{documents.length} documents</Badge>
          </div>
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

        {/* Folders */}
        {allFolders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span>Folders:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* All Documents */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                  selectedFolderId === null 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-accent'
                } ${dragOverFolderId === 'none' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedFolderId(null)}
                onDragOver={(e) => handleDragOver(e, null)}
                onDrop={(e) => handleDrop(e, null)}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">All</span>
                <Badge variant="secondary" className="text-xs">
                  {documents.length}
                </Badge>
              </div>

              {/* Folder buttons */}
              {allFolders.map((folder) => {
                const IconComponent = getFolderIcon(folder.icon);
                const isSelected = selectedFolderId === folder.id;
                const isDragOver = dragOverFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-accent'
                    } ${isDragOver ? 'ring-2 ring-primary scale-105' : ''}`}
                    onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDrop={(e) => handleDrop(e, folder.id)}
                  >
                    <IconComponent 
                      className="h-4 w-4" 
                      style={{ color: folder.color }}
                    />
                    <span className="text-sm">{folder.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {folderDocCounts[folder.id] || 0}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery || selectedFolderId ? "No documents found" : "No documents yet"}
            </p>
          ) : (
            filteredDocuments.map((doc) => {
              const docFolder = allFolders.find(f => f.id === doc.folder_id);
              const FolderIcon = docFolder ? getFolderIcon(docFolder.icon) : null;
              const suggestedTags = doc.ai_analysis?.suggestedTags || [];

              return (
                <Card
                  key={doc.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc.id)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedDocumentId === doc.id ? 'ring-2 ring-primary' : ''
                  } ${draggedDocId === doc.id ? 'opacity-50' : ''}`}
                  onClick={() => onDocumentSelect(doc)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2">
                      {/* Drag Handle */}
                      <div className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <p className="font-medium truncate">{doc.file_name}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Folder indicator */}
                          {docFolder && FolderIcon && (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: docFolder.color + '40', color: docFolder.color }}
                            >
                              <FolderIcon className="h-3 w-3 mr-1" />
                              {docFolder.name}
                            </Badge>
                          )}
                          <Badge 
                            className={getDocumentTypeColor(doc.document_type)} 
                            variant="outline"
                          >
                            {doc.document_type || 'Unknown'}
                          </Badge>
                          {doc.ai_analysis?.urgency && (
                            <Badge variant={getUrgencyColor(doc.ai_analysis.urgency)}>
                              {doc.ai_analysis.urgency} urgency
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {doc.created_at && formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </div>

                        {/* AI Suggested Tags */}
                        {suggestedTags.length > 0 && (
                          <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs gap-1 text-amber-600 hover:text-amber-700"
                              onClick={() => applyAutoTags(doc.id, suggestedTags)}
                            >
                              <Sparkles className="h-3 w-3" />
                              Apply AI tags ({suggestedTags.length})
                            </Button>
                          </div>
                        )}

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
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
};

export default DocumentHistory;
