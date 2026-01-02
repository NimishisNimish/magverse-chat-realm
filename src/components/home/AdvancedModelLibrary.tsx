import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
    <section className="py-28 relative z-10">
      {/* Background effects */}
      <div className="absolute inset-0 spotlight-bottom pointer-events-none" />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Our Latest Creations</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Advanced Model Library
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Toggle between the world's most capable foundation models in real-time.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative max-w-6xl mx-auto">
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
                    <div className="bg-card border border-border rounded-2xl p-6 h-full card-hover-effect group relative overflow-hidden">
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex flex-col items-center space-y-4 text-center relative z-10">
                        {/* Logo */}
                        <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors overflow-hidden">
                          {logoSrc ? (
                            <img 
                              src={logoSrc} 
                              alt={model.name}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <model.icon className={`w-8 h-8 ${model.color}`} />
                          )}
                        </div>
                        
                        {/* Name */}
                        <h3 className="text-lg font-bold text-foreground">
                          {model.name}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {model.description}
                        </p>
                        
                        {/* Category badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {model.category}
                        </div>
                        
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted hover:border-primary/50 transition-all z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted hover:border-primary/50 transition-all z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {MODEL_CONFIG.slice(0, 6).map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                selectedIndex === index 
                  ? 'bg-primary w-6' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
