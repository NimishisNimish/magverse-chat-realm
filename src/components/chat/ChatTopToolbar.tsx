import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Download, 
  Brain, 
  Zap, 
  Volume2, 
  VolumeX,
  Eye,
  EyeOff,
  Menu,
  Sparkles
} from "lucide-react";
import { CreditBalanceIndicator } from "@/components/CreditBalanceIndicator";
import { AIModelLogo } from "@/components/AIModelLogo";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatTopToolbarProps {
  selectedModels: string[];
  loading: boolean;
  elapsedTime: number;
  retryAttempt: number;
  soundEnabled: boolean;
  showThinkingProcess: boolean;
  autoSelectModel: boolean;
  onToggleSidebar: () => void;
  onToggleSound: () => void;
  onToggleThinking: () => void;
  onToggleAutoSelect: () => void;
  onExportChat: () => void;
  onOpenSettings: () => void;
  isMobile?: boolean;
}

export const ChatTopToolbar = ({
  selectedModels,
  loading,
  elapsedTime,
  retryAttempt,
  soundEnabled,
  showThinkingProcess,
  autoSelectModel,
  onToggleSidebar,
  onToggleSound,
  onToggleThinking,
  onToggleAutoSelect,
  onExportChat,
  onOpenSettings,
  isMobile = false,
}: ChatTopToolbarProps) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-xl px-4 flex items-center justify-between gap-2 shrink-0"
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Sidebar Toggle - Desktop */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-8 w-8 shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Active Models Display */}
        <div className="flex items-center gap-1.5 min-w-0">
          {selectedModels.slice(0, 2).map((modelId) => (
            <motion.div
              key={modelId}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 border border-border/50"
            >
              <AIModelLogo modelId={modelId} size="sm" />
              <span className="text-xs font-medium hidden sm:inline truncate max-w-[80px]">
                {modelId.replace('lovable-', '').replace('-', ' ')}
              </span>
            </motion.div>
          ))}
          {selectedModels.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{selectedModels.length - 2}
            </Badge>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-500"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {retryAttempt > 0 ? `Retry ${retryAttempt}...` : `${(elapsedTime / 1000).toFixed(1)}s`}
            </span>
          </motion.div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Credits */}
        <CreditBalanceIndicator />

        {/* Quick Toggle Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSound}
            className={cn("h-8 w-8", soundEnabled && "text-purple-400")}
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleThinking}
            className={cn("h-8 w-8", showThinkingProcess && "text-purple-400")}
            title={showThinkingProcess ? "Hide thinking" : "Show thinking"}
          >
            {showThinkingProcess ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Auto-select Model
                </div>
                <Switch
                  checked={autoSelectModel}
                  onCheckedChange={onToggleAutoSelect}
                />
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleSound} className="gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {soundEnabled ? "Mute sounds" : "Enable sounds"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleThinking} className="gap-2">
              {showThinkingProcess ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showThinkingProcess ? "Hide thinking" : "Show thinking"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportChat} className="gap-2">
              <Download className="h-4 w-4" />
              Export Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
              <Settings className="h-4 w-4" />
              All Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
};
