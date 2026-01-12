import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Square,
  Plus,
  Image as ImageIcon,
  FileSearch,
  Search,
  Settings,
  Layers,
  Zap,
  Brain,
  Globe,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import { AIModelLogo } from "@/components/AIModelLogo";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  input: string;
  loading: boolean;
  uploading: boolean;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentFileName: string | null;
  selectedModels: string[];
  activeQuickAction: string | null;
  webSearchEnabled: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  onQuickActionSelect: (action: string) => void;
  onToggleWebSearch: () => void;
  onOpenImageDialog: () => void;
  onOpenDocumentDialog: () => void;
  onOpenModelSelection: () => void;
  onModelToggle: (modelId: string) => void;
}

const aiModels = [
  { id: "lovable-gemini-flash", name: "Gemini Flash" },
  { id: "lovable-gpt5-mini", name: "GPT-5 Mini" },
  { id: "lovable-gemini-pro", name: "Gemini Pro" },
  { id: "lovable-gpt5", name: "GPT-5" },
];

export const ChatComposer = ({
  input,
  loading,
  uploading,
  uploadStatus,
  attachmentUrl,
  attachmentType,
  attachmentFileName,
  selectedModels,
  activeQuickAction,
  webSearchEnabled,
  onInputChange,
  onSend,
  onStop,
  onKeyPress,
  onFileUpload,
  onRemoveAttachment,
  onQuickActionSelect,
  onToggleWebSearch,
  onOpenImageDialog,
  onOpenDocumentDialog,
  onOpenModelSelection,
  onModelToggle,
}: ChatComposerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-border/50 bg-gradient-to-t from-card/80 to-transparent backdrop-blur-xl p-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Attachment Preview */}
        <AnimatePresence>
          {attachmentUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                {attachmentType === 'image' ? (
                  <img
                    src={attachmentUrl}
                    alt="Preview"
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                    <FileSearch className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachmentFileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadStatus === 'uploading' && "Uploading..."}
                    {uploadStatus === 'success' && "Ready to send"}
                    {uploadStatus === 'error' && "Upload failed"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRemoveAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Composer Card */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur shadow-lg shadow-purple-500/5 overflow-hidden">
          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 p-3 border-b border-border/30 overflow-x-auto scrollbar-hide">
            {/* Web Search Toggle - New Feature */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shrink-0",
              webSearchEnabled 
                ? "bg-cyan-500/20 border-cyan-500/50" 
                : "bg-muted/50 border-border/40"
            )}>
              <Globe className={cn(
                "h-3.5 w-3.5",
                webSearchEnabled ? "text-cyan-400" : "text-muted-foreground"
              )} />
              <span className="text-xs font-medium">Web</span>
              <Switch
                checked={webSearchEnabled}
                onCheckedChange={onToggleWebSearch}
                className="h-4 w-7"
              />
            </div>

            {/* Mode Buttons */}
            {[
              { id: 'fast', icon: Zap, label: 'Fast', color: 'yellow' },
              { id: 'reasoning', icon: Brain, label: 'Think', color: 'purple' },
              { id: 'research', icon: Search, label: 'Research', color: 'cyan' },
            ].map(({ id, icon: Icon, label, color }) => (
              <Button
                key={id}
                variant="ghost"
                size="sm"
                onClick={() => onQuickActionSelect(`${id}-mode`)}
                className={cn(
                  "h-7 px-2.5 rounded-full border gap-1.5 shrink-0 transition-all",
                  activeQuickAction === id
                    ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-400`
                    : "bg-muted/50 border-border/40 hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">{label}</span>
              </Button>
            ))}

            {/* Create Image */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenImageDialog}
              className="h-7 px-2.5 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/30 gap-1.5 shrink-0"
            >
              <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-xs hidden sm:inline">Create</span>
            </Button>

            {/* More Tools */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-full bg-muted/50 hover:bg-muted border border-border/40 shrink-0"
                >
                  <Layers className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={onOpenDocumentDialog} className="gap-2">
                  <FileSearch className="h-4 w-4" />
                  Analyze Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenModelSelection} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Select Models
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Input Row */}
          <div className="flex items-end gap-2 p-3">
            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={onFileUpload}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : uploadStatus === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : uploadStatus === 'error' ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>

            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <Textarea
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyPress}
                placeholder={webSearchEnabled ? "Search the web and ask anything... 🌐" : "Ask anything... ✨"}
                className="min-h-[44px] max-h-[200px] resize-none rounded-xl border-0 bg-transparent px-3 py-3 text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                disabled={loading}
              />
            </div>

            {/* Send/Stop Button */}
            {loading ? (
              <Button
                onClick={onStop}
                size="icon"
                variant="destructive"
                className="shrink-0 rounded-xl h-10 w-10 sm:h-11 sm:w-11 shadow-lg"
                title="Stop generation"
              >
                <Square className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={!input.trim() && !attachmentUrl}
                size="icon"
                className="shrink-0 rounded-xl h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
                title="Send message (Enter)"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Selected Models - Compact display */}
        {selectedModels.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground justify-center"
          >
            <span>Using:</span>
            {selectedModels.slice(0, 3).map(modelId => {
              const model = aiModels.find(m => m.id === modelId);
              return (
                <Badge
                  key={modelId}
                  variant="outline"
                  className="h-5 px-1.5 gap-1 text-[10px] cursor-pointer hover:bg-muted"
                  onClick={() => onModelToggle(modelId)}
                >
                  <AIModelLogo modelId={modelId} size="sm" />
                  {model?.name.split(' ')[0]}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              );
            })}
            {selectedModels.length > 3 && (
              <span className="text-muted-foreground">+{selectedModels.length - 3}</span>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
