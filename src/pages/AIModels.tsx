import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Zap, Brain, Globe, Image, Sparkles, Check, X, Sun, Moon, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AIModelLogo } from "@/components/AIModelLogo";
import { MODEL_CONFIG } from "@/config/modelConfig";
import Navbar from "@/components/Navbar";

// Extended model info with pricing
const modelDetails: Record<string, {
  pricing: string;
  features: string[];
  limitations: string[];
  bestFor: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'premium';
}> = {
  'lovable-gemini-flash': {
    pricing: '1 credit/message',
    features: ['Fast responses', 'Good for general tasks', 'Code assistance', 'Multi-language support'],
    limitations: ['Less complex reasoning', 'Shorter context'],
    bestFor: 'Quick questions & daily tasks',
    speed: 'fast',
    quality: 'standard'
  },
  'lovable-gpt5-mini': {
    pricing: '1 credit/message',
    features: ['Lightweight & fast', 'Good coding abilities', 'Efficient processing'],
    limitations: ['Limited reasoning depth', 'Basic analysis'],
    bestFor: 'Simple coding tasks & quick answers',
    speed: 'fast',
    quality: 'standard'
  },
  'lovable-gemini-pro': {
    pricing: '2 credits/message',
    features: ['Advanced reasoning', 'Complex analysis', 'Better context understanding', 'Detailed explanations'],
    limitations: ['Slower than Flash', 'Higher credit cost'],
    bestFor: 'Complex problems & analysis',
    speed: 'medium',
    quality: 'high'
  },
  'lovable-gpt5': {
    pricing: '3 credits/message',
    features: ['Most capable', 'Excellent reasoning', 'Creative writing', 'Advanced coding'],
    limitations: ['Highest credit cost', 'Slower responses'],
    bestFor: 'Complex reasoning & creative tasks',
    speed: 'slow',
    quality: 'premium'
  },
  'chatgpt': {
    pricing: '2 credits/message',
    features: ['GPT-4o powered', 'Strong general knowledge', 'Good at conversation'],
    limitations: ['Requires API key', 'Rate limited'],
    bestFor: 'General conversations & knowledge',
    speed: 'medium',
    quality: 'high'
  },
  'claude': {
    pricing: '2 credits/message',
    features: ['Thoughtful responses', 'Strong analysis', 'Good at writing'],
    limitations: ['Requires API key', 'Slower processing'],
    bestFor: 'Writing & thoughtful analysis',
    speed: 'medium',
    quality: 'high'
  },
  'perplexity': {
    pricing: '1 credit/message',
    features: ['Real-time web search', 'Current information', 'Source citations'],
    limitations: ['Limited reasoning', 'Search-focused'],
    bestFor: 'Research & current events',
    speed: 'fast',
    quality: 'standard'
  },
  'perplexity-pro': {
    pricing: '2 credits/message',
    features: ['Multi-step reasoning', 'More sources', 'Deeper analysis'],
    limitations: ['Higher cost', 'Requires API key'],
    bestFor: 'In-depth research',
    speed: 'medium',
    quality: 'high'
  },
  'perplexity-reasoning': {
    pricing: '3 credits/message',
    features: ['Expert analysis', 'Multi-query research', 'Comprehensive sources'],
    limitations: ['Slowest', 'Highest cost'],
    bestFor: 'Expert-level research',
    speed: 'slow',
    quality: 'premium'
  },
  'grok': {
    pricing: '2 credits/message',
    features: ['Real-time knowledge', 'X/Twitter integration', 'Witty responses'],
    limitations: ['Requires API key', 'Sometimes irreverent'],
    bestFor: 'Current events & social trends',
    speed: 'medium',
    quality: 'high'
  },
  'uncensored-chat': {
    pricing: '1 credit/message',
    features: ['Unfiltered responses', 'No content restrictions'],
    limitations: ['May produce harmful content', 'Use responsibly'],
    bestFor: 'Unrestricted conversations',
    speed: 'fast',
    quality: 'standard'
  },
  'gemini-flash-image': {
    pricing: '5 credits/image',
    features: ['AI image generation', 'High quality output', 'Various styles'],
    limitations: ['Image only', 'Higher credit cost'],
    bestFor: 'Creating images & artwork',
    speed: 'medium',
    quality: 'high'
  },
  'lovable-gemini-flash-image': {
    pricing: '5 credits/image',
    features: ['AI image via Lovable Gateway', 'High quality', 'Fast generation'],
    limitations: ['Image only', 'Credit intensive'],
    bestFor: 'Quick image generation',
    speed: 'fast',
    quality: 'high'
  },
};

const categoryIcons = {
  fast: Zap,
  reasoning: Brain,
  research: Globe,
  image: Image,
};

const categoryColors = {
  fast: 'from-blue-500 to-cyan-500',
  reasoning: 'from-purple-500 to-pink-500',
  research: 'from-emerald-500 to-teal-500',
  image: 'from-orange-500 to-red-500',
};

const speedBadge = {
  fast: { label: 'Fast', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  slow: { label: 'Thorough', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const qualityBadge = {
  standard: { label: 'Standard', color: 'bg-muted text-muted-foreground border-border' },
  high: { label: 'High Quality', color: 'bg-primary/20 text-primary border-primary/30' },
  premium: { label: 'Premium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

export default function AIModels() {
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light' | 'both'>('both');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'fast', 'reasoning', 'research', 'image'];
  
  const filteredModels = selectedCategory === 'all' 
    ? MODEL_CONFIG 
    : MODEL_CONFIG.filter(m => m.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">AI Models</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore all available AI models with detailed capabilities, pricing, and use cases
          </p>
        </motion.div>

        {/* Icon Theme Preview Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-xl mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Icon Theme Preview</h3>
              <p className="text-sm text-muted-foreground">
                Test how AI model icons appear in different themes
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant={previewTheme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewTheme('dark')}
                className="gap-2"
              >
                <Moon className="w-4 h-4" />
                Dark
              </Button>
              <Button
                variant={previewTheme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewTheme('light')}
                className="gap-2"
              >
                <Sun className="w-4 h-4" />
                Light
              </Button>
              <Button
                variant={previewTheme === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewTheme('both')}
              >
                Side by Side
              </Button>
            </div>
          </div>

          {/* Icon Preview Grid */}
          <div className={`mt-6 grid gap-4 ${previewTheme === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {(previewTheme === 'dark' || previewTheme === 'both') && (
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Dark Mode Preview
                </h4>
                <div className="flex flex-wrap gap-4">
                  {['chatgpt', 'gemini', 'claude', 'perplexity', 'grok', 'uncensored-chat'].map((modelId) => (
                    <div key={modelId} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800/50">
                      <div className="dark">
                        <AIModelLogo modelId={modelId} size="lg" />
                      </div>
                      <span className="text-xs text-zinc-400 capitalize">{modelId.replace('-', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(previewTheme === 'light' || previewTheme === 'both') && (
              <div className="bg-white rounded-xl p-6 border border-zinc-200">
                <h4 className="text-sm font-medium text-zinc-600 mb-4 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Light Mode Preview
                </h4>
                <div className="flex flex-wrap gap-4">
                  {['chatgpt', 'gemini', 'claude', 'perplexity', 'grok', 'uncensored-chat'].map((modelId) => (
                    <div key={modelId} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-100">
                      <div className="light">
                        <AIModelLogo modelId={modelId} size="lg" />
                      </div>
                      <span className="text-xs text-zinc-600 capitalize">{modelId.replace('-', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {categories.map((category) => {
            const Icon = category === 'all' ? Sparkles : categoryIcons[category as keyof typeof categoryIcons];
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="gap-2 capitalize"
              >
                <Icon className="w-4 h-4" />
                {category === 'all' ? 'All Models' : category}
              </Button>
            );
          })}
        </motion.div>

        {/* Models Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model, index) => {
            const details = modelDetails[model.id];
            const CategoryIcon = categoryIcons[model.category];
            
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="h-full glass-card-hover border-border/50 hover:border-primary/50 transition-all duration-300 group overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${categoryColors[model.category]} bg-opacity-20`}>
                          <AIModelLogo modelId={model.id} size="lg" />
                        </div>
                        <div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {model.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {model.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {model.isLovable && (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Lovable AI
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        <CategoryIcon className="w-3 h-3 mr-1" />
                        {model.category}
                      </Badge>
                      {details && (
                        <>
                          <Badge variant="outline" className={speedBadge[details.speed].color}>
                            {speedBadge[details.speed].label}
                          </Badge>
                          <Badge variant="outline" className={qualityBadge[details.quality].color}>
                            {qualityBadge[details.quality].label}
                          </Badge>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-4">
                    {details && (
                      <>
                        {/* Pricing */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">Pricing</span>
                          <span className="font-semibold text-primary">{details.pricing}</span>
                        </div>
                        
                        {/* Best For */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Best for:</p>
                          <p className="text-sm font-medium">{details.bestFor}</p>
                        </div>
                        
                        {/* Features */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Features:</p>
                          <ul className="space-y-1">
                            {details.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <Check className="w-3 h-3 text-green-500 shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Limitations */}
                        {details.limitations.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Limitations:</p>
                            <ul className="space-y-1">
                              {details.limitations.slice(0, 2).map((limitation, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <X className="w-3 h-3 text-red-500/70 shrink-0" />
                                  <span>{limitation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="glass-card p-8 rounded-2xl max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Ready to try these models?</h2>
            <p className="text-muted-foreground mb-6">
              Start chatting with any AI model instantly. No complicated setup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/chat">
                <Button size="lg" className="gap-2">
                  <Bot className="w-5 h-5" />
                  Start Chatting
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  <Zap className="w-5 h-5" />
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}