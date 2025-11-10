import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface CustomInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstructionsUpdate?: (instructions: string | null) => void;
}

export function CustomInstructionsDialog({ open, onOpenChange, onInstructionsUpdate }: CustomInstructionsDialogProps) {
  const { user } = useAuth();
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasInstructions, setHasInstructions] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadInstructions();
    }
  }, [open, user]);

  const loadInstructions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_custom_instructions')
        .select('instructions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setInstructions(data.instructions);
        setHasInstructions(true);
      } else {
        setInstructions("");
        setHasInstructions(false);
      }
    } catch (error) {
      console.error('Error loading instructions:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (instructions.trim()) {
        // Save or update instructions
        const { error } = await supabase
          .from('ai_custom_instructions')
          .upsert({
            user_id: user.id,
            instructions: instructions.trim(),
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,is_active'
          });

        if (error) throw error;
        
        toast.success('Custom instructions saved successfully');
        onInstructionsUpdate?.(instructions.trim());
      } else {
        // Delete instructions if empty
        const { error } = await supabase
          .from('ai_custom_instructions')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
        
        toast.success('Custom instructions cleared');
        onInstructionsUpdate?.(null);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast.error('Failed to save instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_custom_instructions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setInstructions("");
      setHasInstructions(false);
      toast.success('Custom instructions cleared');
      onInstructionsUpdate?.(null);
    } catch (error) {
      console.error('Error clearing instructions:', error);
      toast.error('Failed to clear instructions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <DialogTitle>Custom AI Instructions</DialogTitle>
          </div>
          <DialogDescription>
            Customize how AI models respond to you. These instructions will be applied to all your conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Examples:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• "Always provide detailed explanations with examples"</li>
              <li>• "Keep responses concise and under 100 words"</li>
              <li>• "Use a professional tone for business queries"</li>
              <li>• "Format code with proper syntax highlighting"</li>
            </ul>
          </div>

          <Textarea
            placeholder="Enter your custom instructions for the AI... (e.g., 'Always explain concepts simply', 'Provide code examples', etc.)"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            className="resize-none"
          />

          <p className="text-xs text-muted-foreground">
            {instructions.length} / 2000 characters
          </p>
        </div>

        <DialogFooter>
          <div className="flex w-full justify-between">
            {hasInstructions && (
              <Button
                variant="destructive"
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || instructions.length > 2000}
              >
                {loading ? 'Saving...' : 'Save Instructions'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomInstructionsButton({ onInstructionsUpdate }: { onInstructionsUpdate?: (instructions: string | null) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Custom Instructions
      </Button>
      <CustomInstructionsDialog
        open={open}
        onOpenChange={setOpen}
        onInstructionsUpdate={onInstructionsUpdate}
      />
    </>
  );
}