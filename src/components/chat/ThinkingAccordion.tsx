import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ThinkingStep {
  step: number;
  thought: string;
  conclusion?: string;
}

interface ThinkingAccordionProps {
  isThinking: boolean;
  thinkingContent: string;
  reasoningSteps?: ThinkingStep[];
  isComplete?: boolean;
  duration?: number;
  defaultOpen?: boolean;
}

export const ThinkingAccordion = memo(({
  isThinking,
  thinkingContent,
  reasoningSteps,
  isComplete = false,
  duration,
  defaultOpen = true,
}: ThinkingAccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  if (!thinkingContent && !reasoningSteps?.length && !isThinking) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-purple-500/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isThinking ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="h-4 w-4 text-purple-400" />
              </motion.div>
            ) : (
              <Brain className="h-4 w-4 text-purple-400" />
            )}
            <span className="text-sm font-medium text-purple-300">
              {isThinking ? "Thinking..." : "Thought Process"}
            </span>
            {isThinking && (
              <motion.div
                className="flex gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-purple-400"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            )}
            {isComplete && duration && (
              <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                {(duration / 1000).toFixed(1)}s
              </Badge>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 border-t border-purple-500/20">
                {/* Streaming thinking content */}
                {thinkingContent && !reasoningSteps?.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed"
                  >
                    {thinkingContent}
                    {isThinking && (
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-2 h-4 bg-purple-400 ml-1 align-middle"
                      />
                    )}
                  </motion.div>
                )}

                {/* Multi-step reasoning */}
                {reasoningSteps && reasoningSteps.length > 0 && (
                  <div className="space-y-3">
                    {reasoningSteps.map((step, index) => (
                      <motion.div
                        key={step.step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pl-6"
                      >
                        {/* Step number connector */}
                        <div className="absolute left-0 top-0 flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-400">{step.step}</span>
                          </div>
                          {index < reasoningSteps.length - 1 && (
                            <div className="w-px h-full bg-gradient-to-b from-purple-500/40 to-transparent" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground italic">
                            {step.thought}
                          </p>
                          {step.conclusion && (
                            <p className="text-sm text-foreground flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-purple-400" />
                              {step.conclusion}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Loading state when no content yet */}
                {isThinking && !thinkingContent && !reasoningSteps?.length && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing your request...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

ThinkingAccordion.displayName = 'ThinkingAccordion';
