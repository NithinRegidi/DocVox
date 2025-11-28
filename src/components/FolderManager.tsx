import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  X, 
  Folder, 
  FolderPlus,
  Receipt, 
  HeartPulse, 
  Scale, 
  Briefcase, 
  Building2, 
  GraduationCap,
  Shield,
  User,
  FileText,
  Wallet
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Folder as FolderType } from "@/integrations/supabase/types";

// Icon mapping
const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'folder': Folder,
  'receipt': Receipt,
  'heart-pulse': HeartPulse,
  'scale': Scale,
  'briefcase': Briefcase,
  'building': Building2,
  'graduation': GraduationCap,
  'shield': Shield,
  'user': User,
  'file': FileText,
  'wallet': Wallet,
};

const ICON_OPTIONS = [
  { value: 'folder', label: 'Folder', icon: Folder },
  { value: 'receipt', label: 'Bills/Receipts', icon: Receipt },
  { value: 'heart-pulse', label: 'Medical', icon: HeartPulse },
  { value: 'scale', label: 'Legal', icon: Scale },
  { value: 'briefcase', label: 'Work', icon: Briefcase },
  { value: 'building', label: 'Government', icon: Building2 },
  { value: 'graduation', label: 'Education', icon: GraduationCap },
  { value: 'shield', label: 'Insurance', icon: Shield },
  { value: 'user', label: 'Personal', icon: User },
  { value: 'wallet', label: 'Financial', icon: Wallet },
];

const PREDEFINED_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#6b7280", // gray
];

const DEFAULT_FOLDERS = [
  { name: 'Bills', color: '#ef4444', icon: 'receipt' },
  { name: 'Medical', color: '#10b981', icon: 'heart-pulse' },
  { name: 'Legal', color: '#8b5cf6', icon: 'scale' },
  { name: 'Financial', color: '#3b82f6', icon: 'wallet' },
  { name: 'Work', color: '#f59e0b', icon: 'briefcase' },
  { name: 'Personal', color: '#ec4899', icon: 'user' },
  { name: 'Government', color: '#06b6d4', icon: 'building' },
  { name: 'Insurance', color: '#84cc16', icon: 'shield' },
  { name: 'Education', color: '#a855f7', icon: 'graduation' },
];

interface FolderManagerProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  showSelector?: boolean;
}

const FolderManager = ({ 
  onFolderSelect, 
  selectedFolderId,
  showSelector = false 
}: FolderManagerProps) => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3b82f6");
  const [newFolderIcon, setNewFolderIcon] = useState("folder");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("name");

      if (error) throw error;
      setFolders((data as FolderType[]) || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("folders").insert({
        user_id: user.id,
        name: newFolderName.trim(),
        color: newFolderColor,
        icon: newFolderIcon,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder created successfully",
      });

      setNewFolderName("");
      setNewFolderColor("#3b82f6");
      setNewFolderIcon("folder");
      fetchFolders();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create folder";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCreateDefaultFolders = async () => {
    setIsCreatingDefaults(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check which default folders already exist
      const existingNames = folders.map(f => f.name.toLowerCase());
      const foldersToCreate = DEFAULT_FOLDERS.filter(
        df => !existingNames.includes(df.name.toLowerCase())
      );

      if (foldersToCreate.length === 0) {
        toast({
          title: "Info",
          description: "All default folders already exist",
        });
        return;
      }

      const { error } = await supabase.from("folders").insert(
        foldersToCreate.map(df => ({
          user_id: user.id,
          name: df.name,
          color: df.color,
          icon: df.icon,
        }))
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${foldersToCreate.length} default folders`,
      });

      fetchFolders();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create folders";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingDefaults(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase.from("folders").delete().eq("id", folderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });

      fetchFolders();
      
      if (selectedFolderId === folderId && onFolderSelect) {
        onFolderSelect(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete folder";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const getFolderIcon = (iconName: string) => {
    const IconComponent = FOLDER_ICONS[iconName] || Folder;
    return IconComponent;
  };

  // If showSelector is true, render a compact folder selector
  if (showSelector) {
    return (
      <Select 
        value={selectedFolderId || "none"} 
        onValueChange={(value) => onFolderSelect?.(value === "none" ? null : value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select folder" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>No Folder</span>
            </div>
          </SelectItem>
          {folders.map((folder) => {
            const IconComponent = getFolderIcon(folder.icon);
            return (
              <SelectItem key={folder.id} value={folder.id}>
                <div className="flex items-center gap-2">
                  <IconComponent 
                    className="h-4 w-4" 
                    style={{ color: folder.color }} 
                  />
                  <span>{folder.name}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  // Full folder manager dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FolderPlus className="h-4 w-4 mr-2" />
          Folders
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Manage Folders
          </DialogTitle>
          <DialogDescription>
            Organize your documents into folders for easy access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Setup */}
          {folders.length < 5 && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Quick setup: Create common folders
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCreateDefaultFolders}
                  disabled={isCreatingDefaults}
                >
                  {isCreatingDefaults ? "Creating..." : "Create Defaults"}
                </Button>
              </div>
            </Card>
          )}

          {/* Create New Folder Form */}
          <form onSubmit={handleCreateFolder} className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              {/* Icon Selector */}
              <Select value={newFolderIcon} onValueChange={setNewFolderIcon}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Color Selector */}
              <div className="flex gap-1">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewFolderColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      newFolderColor === color 
                        ? "border-foreground scale-110" 
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </form>

          {/* Existing Folders */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Your Folders ({folders.length})
            </h4>
            {folders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No folders yet. Create one above or use the quick setup.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {folders.map((folder) => {
                  const IconComponent = getFolderIcon(folder.icon);
                  return (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className="h-5 w-5"
                          style={{ color: folder.color }}
                        />
                        <span className="text-sm font-medium truncate max-w-[100px]">
                          {folder.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderManager;
export { FOLDER_ICONS, getFolderIcon };

function getFolderIcon(iconName: string) {
  return FOLDER_ICONS[iconName] || Folder;
}
