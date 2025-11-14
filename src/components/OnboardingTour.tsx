import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="chat-input"]',
    title: 'Start Chatting',
    description: 'Type your message here to chat with AI. You can ask questions, get creative ideas, or have conversations.',
    position: 'top',
  },
  {
    target: '[data-tour="model-selector"]',
    title: 'Choose Your AI Model',
    description: 'Select from multiple AI models like Gemini Flash, GPT-5 Mini, and more. Each has unique strengths!',
    position: 'bottom',
  },
  {
    target: '[data-tour="upgrade-btn"]',
    title: 'Upgrade to Pro',
    description: 'Unlock all premium AI models, higher message limits, and exclusive features with Pro access.',
    position: 'left',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updatePosition();
      setShow(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep]);

  const updatePosition = () => {
    const step = tourSteps[currentStep];
    const target = document.querySelector(step.target);
    
    if (!target) return;

    const rect = target.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = rect.top - 180;
        left = rect.left + rect.width / 2 - 150;
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2 - 150;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - 75;
        left = rect.left - 320;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - 75;
        left = rect.right + 20;
        break;
    }

    setPosition({ top, left });
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setShow(false);
    setTimeout(onComplete, 300);
  };

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={handleClose}
          />

          {/* Spotlight effect on target element */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              ...(() => {
                const target = document.querySelector(step.target);
                if (!target) return {};
                const rect = target.getBoundingClientRect();
                return {
                  top: rect.top - 8,
                  left: rect.left - 8,
                  width: rect.width + 16,
                  height: rect.height + 16,
                  borderRadius: '12px',
                };
              })(),
            }}
          />

          {/* Tour tooltip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed z-[10000] w-[300px]"
            style={{ top: position.top, left: position.left }}
          >
            <div className="glass-card p-6 rounded-xl shadow-2xl border border-primary/20">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {step.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentStep
                          ? 'w-6 bg-primary'
                          : 'w-1.5 bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  size="sm"
                  className="gap-2"
                >
                  {currentStep === tourSteps.length - 1 ? 'Got it!' : 'Next'}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
