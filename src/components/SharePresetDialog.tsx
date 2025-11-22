import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Share2, Copy, Check, Loader2, Link as LinkIcon } from "lucide-react";

interface SharePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetId: string;
  presetName: string;
}

export const SharePresetDialog = ({
  open,
  onOpenChange,
  presetId,
  presetName
}: SharePresetDialogProps) => {
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setLoading(true);
    try {
      // Generate unique share code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_share_code');
      if (codeError) throw codeError;

      const newShareCode = codeData;

      // Update preset with share code
      const { error: updateError } = await supabase
        .from('model_presets')
        .update({
          share_code: newShareCode,
          is_shared: true,
          shared_at: new Date().toISOString()
        })
        .eq('id', presetId);

      if (updateError) throw updateError;

      setShareCode(newShareCode);
      toast.success("Share link generated!");
    } catch (error: any) {
      console.error("Error generating share link:", error);
      toast.error("Failed to generate share link: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!shareCode) return;
    const shareUrl = `${window.location.origin}/chat?preset=${shareCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share "{presetName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Generate a shareable link that others can use to import this preset configuration into their account.
          </p>

          {!shareCode ? (
            <Button
              onClick={generateShareLink}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Generate Share Link
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/chat?preset=${shareCode}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyShareLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can import your preset configuration. They won't have access to your account.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
