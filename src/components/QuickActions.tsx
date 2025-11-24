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
      className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border/50"
    >
      <span className="text-xs text-muted-foreground font-medium mr-2">Quick Actions:</span>
      {actions.map((action) => {
        const Icon = action.icon;
        const isActive = activeAction === action.id;
        
        return (
          <Button
            key={action.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onActionSelect(isActive ? null : action.id)}
            className={`
              text-xs gap-1.5 transition-all
              ${isActive ? 'bg-accent text-accent-foreground shadow-lg' : 'hover:bg-accent/20'}
            `}
            title={action.description}
          >
            <Icon className={`w-3.5 h-3.5 ${!isActive && action.color}`} />
            {action.label}
          </Button>
        );
      })}
    </motion.div>
  );
};