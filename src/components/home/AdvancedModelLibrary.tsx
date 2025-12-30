import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MODEL_CONFIG } from "@/config/modelConfig";

// Real AI logos
import perplexityLogo from "@/assets/ai-logos/perplexity-logo.png";
import claudeLogo from "@/assets/ai-logos/claude-logo-clean.png";
import chatgptLogo from "@/assets/ai-logos/chatgpt-logo-clean.png";
import grokLogo from "@/assets/ai-logos/grok-logo.png";
import geminiLogo from "@/assets/ai-logos/gemini-logo.svg";
import mistralLogo from "@/assets/ai-logos/mistral-logo-clean.png";
import uncensoredLogo from "@/assets/ai-logos/uncensored-logo.png";

// Map model IDs to their real logos
const MODEL_LOGOS: Record<string, string> = {
  'perplexity': perplexityLogo,
  'perplexity-pro': perplexityLogo,
  'perplexity-reasoning': perplexityLogo,
  'claude': claudeLogo,
  'chatgpt': chatgptLogo,
  'grok': grokLogo,
  'lovable-gemini-flash': geminiLogo,
  'lovable-gemini-pro': geminiLogo,
  'lovable-gpt5': chatgptLogo,
  'lovable-gpt5-mini': chatgptLogo,
  'gemini-flash-image': geminiLogo,
  'lovable-gemini-flash-image': geminiLogo,
  'uncensored-chat': uncensoredLogo,
  'mistral': mistralLogo,
};

export const AdvancedModelLibrary = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    skipSnaps: false,
    containScroll: 'trimSnaps',
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);

    return () => {
      clearInterval(autoplay);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const getModelLogo = (modelId: string) => {
    return MODEL_LOGOS[modelId] || null;
  };

  return (
    <section className="py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground italic">Advanced </span>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-muted-foreground bg-clip-text text-transparent italic">
              Model Library
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Toggle between the world's most capable foundation models in real-time.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative max-w-5xl mx-auto">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {MODEL_CONFIG.map((model, index) => {
                const logoSrc = getModelLogo(model.id);
                
                return (
                  <motion.div
                    key={model.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0"
                  >
                    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 h-full hover:border-primary/50 transition-all duration-300 group">
                      <div className="flex flex-col items-center space-y-5 text-center">
                        {/* Logo or Icon */}
                        <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center group-hover:border-primary/50 transition-colors overflow-hidden">
                          {logoSrc ? (
                            <img 
                              src={logoSrc} 
                              alt={model.name} 
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <model.icon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                        </div>

                        {/* Model name */}
                        <h3 className="text-xl font-bold text-foreground">
                          {model.name}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground">
                          {model.description}
                        </p>

                        {/* Credits badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {model.creditsPerMessage} credit{model.creditsPerMessage > 1 ? 's' : ''}/message
                          </span>
                        </div>

                        {/* Status badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                            Active Interface
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Navigation buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-10">
          {MODEL_CONFIG.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex 
                  ? 'bg-primary w-8' 
                  : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
