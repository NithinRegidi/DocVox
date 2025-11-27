import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag as TagIcon, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag, DocumentTag } from "@/integrations/supabase/types";

interface TagSelectorProps {
  documentId: string;
  onTagsChange?: () => void;
}

const TagSelector = ({ documentId, onTagsChange }: TagSelectorProps) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [documentTags, setDocumentTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

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

  const fetchDocumentTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("document_tags")
        .select("tag_id, tags(*)")
        .eq("document_id", documentId);

      if (error) throw error;
      
      const tags = (data as DocumentTag[])?.map((dt: DocumentTag) => dt.tags).filter(Boolean) as Tag[] || [];
      setDocumentTags(tags);
    } catch (error) {
      console.error("Error fetching document tags:", error);
    }
  }, [documentId]);

  useEffect(() => {
    fetchTags();
    fetchDocumentTags();
  }, [documentId, fetchDocumentTags]);

  const handleAddTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from("document_tags").insert({
        document_id: documentId,
        tag_id: tagId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag added successfully",
      });

      fetchDocumentTags();
      onTagsChange?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add tag";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .eq("document_id", documentId)
        .eq("tag_id", tagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag removed successfully",
      });

      fetchDocumentTags();
      onTagsChange?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to remove tag";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const availableTags = allTags.filter(
    (tag) => !documentTags.find((dt) => dt.id === tag.id)
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {documentTags.map((tag) => (
        <Badge
          key={tag.id}
          style={{
            backgroundColor: tag.color + "20",
            color: tag.color,
            borderColor: tag.color + "40",
          }}
          variant="outline"
          className="gap-1"
        >
          {tag.name}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-1 hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6">
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          <div className="space-y-1">
            {availableTags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No more tags available
              </p>
            ) : (
              availableTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    handleAddTag(tag.id);
                    setIsOpen(false);
                  }}
                >
                  <Badge
                    style={{
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                      borderColor: tag.color + "40",
                    }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                </Button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TagSelector;
