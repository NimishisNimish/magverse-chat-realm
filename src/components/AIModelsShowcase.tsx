import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { AIModelLogo } from "./AIModelLogo";
import { MODEL_CONFIG } from "@/config/modelConfig";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const AIModelsShowcase = () => {
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
    
    // Auto-play carousel
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 3000);

    return () => {
      clearInterval(autoplay);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="container mx-auto px-4 py-20 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powered by <span className="gradient-text">Google Gemini</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access the world's most advanced AI models via Lovable AI Gateway
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            ⚡ Fast, reliable, and intelligent responses powered by Google's latest AI
          </p>
        </motion.div>

        <div className="relative">
          {/* Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {MODEL_CONFIG.map((model, index) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0"
                >
                  <div className="glass-card-hover p-8 rounded-2xl h-full border-2 border-border/50 hover:border-primary/50 transition-all duration-300 group">
                    <div className="flex flex-col items-center space-y-4 text-center">
                      {/* Logo with glow effect */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="relative"
                        >
                          <AIModelLogo modelId={model.id} size="xl" className="drop-shadow-2xl" />
                        </motion.div>
                      </div>

                      {/* Model name */}
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                        {model.name}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {model.description}
                      </p>

                      {/* Status badge */}
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 dark:text-green-400">
                        Available
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 glass-card p-2 rounded-full hover:bg-primary/20 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 glass-card p-2 rounded-full hover:bg-primary/20 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {MODEL_CONFIG.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === selectedIndex 
                  ? 'bg-primary w-8' 
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
