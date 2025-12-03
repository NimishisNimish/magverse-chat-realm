import { Button } from '@/components/ui/button';
import { Zap, Brain, Image, FileText, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export type QuickActionType = 'fast' | 'reasoning' | 'image' | 'summarize' | 'research' | null;

interface QuickActionsProps {
  activeAction: QuickActionType;
  onActionSelect: (action: QuickActionType) => void;
}

const actions = [
  {
    id: 'fast' as QuickActionType,
    label: 'Fast',
    icon: Zap,
    description: 'Quick responses with lightweight models',
    color: 'text-yellow-500',
  },
  {
    id: 'reasoning' as QuickActionType,
    label: 'Reasoning',
    icon: Brain,
    description: 'Step-by-step logical thinking',
    color: 'text-purple-500',
  },
  {
    id: 'image' as QuickActionType,
    label: 'Image',
    icon: Image,
    description: 'Generate AI images',
    color: 'text-pink-500',
  },
  {
    id: 'summarize' as QuickActionType,
    label: 'Summary',
    icon: FileText,
    description: 'Summarize conversation',
    color: 'text-blue-500',
  },
  {
    id: 'research' as QuickActionType,
    label: 'Research',
    icon: Search,
    description: 'Deep web search with sources',
    color: 'text-green-500',
  },
];

export const QuickActions = ({ activeAction, onActionSelect }: QuickActionsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-start gap-3 px-4 py-4"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const isActive = activeAction === action.id;
        
        return (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onActionSelect(isActive ? null : action.id)}
            className={`
              flex flex-col items-start gap-1 px-4 py-3 rounded-xl border transition-all text-left
              ${isActive 
                ? 'bg-primary/10 border-primary/50 shadow-lg' 
                : 'bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : action.color}`} />
              <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {action.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground leading-tight max-w-[140px]">
              {action.description}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};