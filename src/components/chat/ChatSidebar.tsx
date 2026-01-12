import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  MessageSquare, 
  Plus, 
  Menu, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatHistoryItem {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatHistory: ChatHistoryItem[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
  isMobile?: boolean;
}

export const ChatSidebar = ({
  isOpen,
  onToggle,
  chatHistory,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isMobile = false,
}: ChatSidebarProps) => {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <Button
          onClick={onNewChat}
          className="w-full gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-foreground"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Chat History List */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2 space-y-1">
          <AnimatePresence>
            {chatHistory.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.02 }}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 h-auto py-3 px-3 text-left group relative",
                    currentChatId === chat.id 
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/10 border-l-2 border-purple-500" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare className={cn(
                    "h-4 w-4 shrink-0",
                    currentChatId === chat.id ? "text-purple-400" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {chat.title || "New conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {chat.updated_at && format(new Date(chat.updated_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {onDeleteChat && hoveredChatId === chat.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {chatHistory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 bg-card/95 backdrop-blur-xl border-r border-border/50">
          <SheetHeader className="sr-only">
            <SheetTitle>Chat History</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Collapsible Sidebar
  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 280 : 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-full bg-card/50 backdrop-blur-xl border-r border-border/50 overflow-hidden relative shrink-0"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-[280px] h-full"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button - Positioned on edge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-4 h-6 w-6 rounded-full bg-muted/80 hover:bg-muted border border-border/50 z-10",
          isOpen ? "right-2" : "-right-3"
        )}
      >
        {isOpen ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>
    </motion.div>
  );
};
