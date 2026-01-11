import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Tag, ExternalLink, X, Rocket, Zap, Bug, Megaphone, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface FeatureUpdate {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  image_url: string | null;
  version: string | null;
  category: string;
  published_at: string | null;
  created_at: string;
}

interface PatchDetailDialogProps {
  update: FeatureUpdate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  feature: Rocket,
  improvement: Zap,
  bugfix: Bug,
  announcement: Megaphone,
  default: Sparkles,
};

const categoryColors: Record<string, string> = {
  feature: "from-purple-500 to-pink-500",
  improvement: "from-blue-500 to-cyan-500",
  bugfix: "from-orange-500 to-red-500",
  announcement: "from-green-500 to-emerald-500",
  default: "from-primary to-purple-500",
};

export const PatchDetailDialog = ({ update, open, onOpenChange }: PatchDetailDialogProps) => {
  if (!update) return null;

  const Icon = categoryIcons[update.category] || categoryIcons.default;
  const gradient = categoryColors[update.category] || categoryColors.default;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={update.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header Image */}
            {update.image_url ? (
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={update.image_url}
                  alt={update.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <Badge 
                  className={`absolute top-4 left-4 bg-gradient-to-r ${gradient} text-white border-0 capitalize`}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {update.category}
                </Badge>
              </div>
            ) : (
              <div className={`h-32 bg-gradient-to-r ${gradient} flex items-center justify-center`}>
                <Icon className="w-16 h-16 text-white/80" />
              </div>
            )}

            <div className="p-6">
              <DialogHeader className="space-y-4">
                {/* Meta Info */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {update.published_at && format(new Date(update.published_at), 'MMMM d, yyyy')}
                  </div>
                  {update.version && (
                    <>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        <span>v{update.version}</span>
                      </div>
                    </>
                  )}
                  {!update.image_url && (
                    <>
                      <span className="text-border">•</span>
                      <Badge variant="outline" className="capitalize">
                        <Icon className="w-3 h-3 mr-1" />
                        {update.category}
                      </Badge>
                    </>
                  )}
                </div>

                {/* Title */}
                <DialogTitle className="text-2xl font-bold leading-tight">
                  {update.title}
                </DialogTitle>
              </DialogHeader>

              {/* Content */}
              <ScrollArea className="mt-6 max-h-[40vh] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {/* Parse content - handle markdown-like formatting */}
                  {update.content.split('\n').map((paragraph, index) => {
                    if (!paragraph.trim()) return <br key={index} />;
                    
                    // Handle headings
                    if (paragraph.startsWith('## ')) {
                      return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{paragraph.slice(3)}</h3>;
                    }
                    if (paragraph.startsWith('### ')) {
                      return <h4 key={index} className="text-md font-medium mt-3 mb-1">{paragraph.slice(4)}</h4>;
                    }
                    
                    // Handle bullet points
                    if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                      return (
                        <div key={index} className="flex items-start gap-2 my-1">
                          <span className="text-primary mt-1.5">•</span>
                          <span>{paragraph.slice(2)}</span>
                        </div>
                      );
                    }
                    
                    // Regular paragraph
                    return <p key={index} className="my-2 text-muted-foreground leading-relaxed">{paragraph}</p>;
                  })}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
