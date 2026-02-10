import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIModelLogo } from './AIModelLogo';

interface ModelRecommendationBannerProps {
  recommendation: {
    queryType: string;
    recommendedModelId: string;
    recommendedModelName: string;
    reason: string;
    icon: string;
    color: string;
  } | null;
  onSwitch: (modelId: string) => void;
  onDismiss: () => void;
}

export const ModelRecommendationBanner = memo(({ recommendation, onSwitch, onDismiss }: ModelRecommendationBannerProps) => {
  return (
    <AnimatePresence>
      {recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 8, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-2"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-sm">
            <span className="text-base shrink-0">{recommendation.icon}</span>
            <AIModelLogo modelId={recommendation.recommendedModelId} size="sm" />
            <span className="text-muted-foreground truncate">
              <span className="font-medium text-foreground">{recommendation.recommendedModelName}</span>
              {' — '}{recommendation.reason}
            </span>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSwitch(recommendation.recommendedModelId)}
                className="h-6 px-2 text-xs text-primary hover:text-primary gap-1"
              >
                Switch
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ModelRecommendationBanner.displayName = 'ModelRecommendationBanner';
