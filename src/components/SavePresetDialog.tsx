import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface SavePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModels: string[];
  webSearchEnabled: boolean;
  searchMode: string;
  deepResearchMode: boolean;
  onPresetSaved: () => void;
}

export const SavePresetDialog = ({
  open,
  onOpenChange,
  selectedModels,
  webSearchEnabled,
  searchMode,
  deepResearchMode,
  onPresetSaved
}: SavePresetDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("general");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to save presets");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    if (selectedModels.length === 0) {
      toast.error("Please select at least one model");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('model_presets')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          task_type: taskType,
          models: selectedModels,
          settings: {
            webSearch: webSearchEnabled,
            searchMode: searchMode,
            deepResearch: deepResearchMode
          },
          is_system_preset: false
        });

      if (error) throw error;

      toast.success("Preset saved successfully!");
      setName("");
      setDescription("");
      setTaskType("general");
      onOpenChange(false);
      onPresetSaved();
    } catch (error: any) {
      console.error("Error saving preset:", error);
      toast.error("Failed to save preset: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Save Model Preset
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Preset Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Fast Research, Creative Writing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this preset good for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskType">Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger id="taskType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="creative">Creative Writing</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">Current Configuration:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Models: {selectedModels.join(", ")}</p>
              {webSearchEnabled && <p>• Web Search: {searchMode}</p>}
              {deepResearchMode && <p>• Deep Research: Enabled</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
