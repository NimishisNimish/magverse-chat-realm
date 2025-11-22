import { useEffect, useState } from 'react';
import { usePresetDetection } from '@/hooks/usePresetDetection';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartPresetSuggestionProps {
  message: string;
  currentPreset: string | null;
  onApplyPreset: (presetId: string) => void;
}

export const SmartPresetSuggestion = ({
  message,
  currentPreset,
  onApplyPreset,
}: SmartPresetSuggestionProps) => {
  const { presetSuggestion } = usePresetDetection(message);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [presetSuggestion]);

  if (!presetSuggestion || currentPreset === presetSuggestion.id || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <Alert className="bg-primary/10 border-primary/30">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Smart Suggestion</p>
              <p className="text-sm text-muted-foreground">
                Try <strong>{presetSuggestion.name}</strong> preset for better results - {presetSuggestion.description}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => onApplyPreset(presetSuggestion.id)}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};
