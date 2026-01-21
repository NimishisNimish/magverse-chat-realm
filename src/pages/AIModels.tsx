import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Brain, Globe, Image, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AIModelLogo } from "@/components/AIModelLogo";
import { MODEL_CONFIG, ModelConfig } from "@/config/modelConfig";
import Navbar from "@/components/Navbar";

// Category configuration
const categories = [
  { id: 'all', label: 'All Models', icon: Sparkles },
  { id: 'fast', label: 'Fast', icon: Zap },
  { id: 'reasoning', label: 'Reasoning', icon: Brain },
  { id: 'research', label: 'Research', icon: Globe },
  { id: 'image', label: 'Image', icon: Image },
];

// Extended model details
const modelDetails: Record<string, {
  tagline: string;
  speed: 'fast' | 'medium' | 'slow';
  creditsPerUse: number;
}> = {
  'lovable-gemini-flash': {
    tagline: 'Lightning-fast responses for everyday tasks',
    speed: 'fast',
    creditsPerUse: 1,
  },
  'lovable-gpt5-mini': {
    tagline: 'Efficient AI for quick coding and questions',
    speed: 'fast',
    creditsPerUse: 1,
  },
  'lovable-gemini-pro': {
    tagline: 'Advanced reasoning for complex problems',
    speed: 'medium',
    creditsPerUse: 2,
  },
  'lovable-gpt5': {
    tagline: 'Premium AI for creative and analytical work',
    speed: 'slow',
    creditsPerUse: 3,
  },
  'chatgpt': {
    tagline: 'GPT-4o powered conversational AI',
    speed: 'medium',
    creditsPerUse: 2,
  },
  'claude': {
    tagline: 'Thoughtful analysis and nuanced writing',
    speed: 'medium',
    creditsPerUse: 2,
  },
  'perplexity': {
    tagline: 'Real-time web search with citations',
    speed: 'fast',
    creditsPerUse: 1,
  },
  'perplexity-pro': {
    tagline: 'Deep research with comprehensive sources',
    speed: 'medium',
    creditsPerUse: 2,
  },
  'perplexity-reasoning': {
    tagline: 'Expert-level multi-step research',
    speed: 'slow',
    creditsPerUse: 3,
  },
  'grok': {
    tagline: 'Real-time knowledge with a unique perspective',
    speed: 'medium',
    creditsPerUse: 2,
  },
  'uncensored-chat': {
    tagline: 'Unfiltered AI conversations',
    speed: 'fast',
    creditsPerUse: 1,
  },
  'gemini-flash-image': {
    tagline: 'Create stunning AI-generated images',
    speed: 'medium',
    creditsPerUse: 5,
  },
  'lovable-gemini-flash-image': {
    tagline: 'Fast AI image generation via Lovable',
    speed: 'fast',
    creditsPerUse: 5,
  },
};

const categoryColors: Record<string, string> = {
  fast: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
  reasoning: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  research: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  image: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
};

const speedColors: Record<string, string> = {
  fast: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  slow: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const speedLabels: Record<string, string> = {
  fast: 'Fast',
  medium: 'Balanced',
  slow: 'Thorough',
};

// Model Card Component
const ModelCard = ({ model, index }: { model: ModelConfig; index: number }) => {
  const details = modelDetails[model.id];
  const categoryColor = categoryColors[model.category] || 'from-muted/20 to-muted/10 border-border';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${categoryColor} border backdrop-blur-sm`}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ x: ['-200%', '200%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        />
      </div>
      
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              className="relative"
            >
              <AIModelLogo modelId={model.id} size="lg" />
            </motion.div>
            
            <div>
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                {model.name}
              </h3>
              {model.isLovable && (
                <Badge variant="outline" className="mt-1 text-xs bg-primary/10 text-primary border-primary/20">
                  Lovable AI
                </Badge>
              )}
            </div>
          </div>
          
          {details && (
            <Badge 
              variant="outline" 
              className={`shrink-0 text-xs ${speedColors[details.speed]}`}
            >
              {speedLabels[details.speed]}
            </Badge>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {details?.tagline || model.description}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Credits:</span>
            <span className="text-sm font-medium text-primary">
              {details?.creditsPerUse || 1}/msg
            </span>
          </div>
          
          <Link to="/chat">
            <Button 
              size="sm" 
              variant="ghost" 
              className="gap-1.5 text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors"
            >
              Try now
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const AIModels = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Filter models
  const filteredModels = MODEL_CONFIG.filter(model => {
    const matchesCategory = activeCategory === 'all' || model.category === activeCategory;
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]"
        />
      </div>

      <Navbar />

      <main className="relative z-10 pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Explore AI Models</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            >
              <span className="text-foreground">Powerful AI Models</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                At Your Fingertips
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Choose from the world's leading AI models. Fast responses, deep reasoning, 
              web search, and image generation — all unified in one platform.
            </motion.p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-12 space-y-6"
          >
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-12 bg-card/50 border-border/50 rounded-xl backdrop-blur-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category, index) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Models Grid */}
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredModels.map((model, index) => (
                <ModelCard key={model.id} model={model} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty state */}
          {filteredModels.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-muted-foreground text-lg mb-4">
                No models found matching "{searchQuery}"
              </div>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-20 text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 p-8 rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50">
              <Sparkles className="w-8 h-8 text-primary" />
              <h3 className="text-2xl font-bold">Ready to get started?</h3>
              <p className="text-muted-foreground max-w-md">
                Experience the power of multiple AI models in one unified chat interface.
              </p>
              <Link to="/chat">
                <Button size="lg" className="gap-2 rounded-full">
                  Start Chatting
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AIModels;