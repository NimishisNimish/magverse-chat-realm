import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, Brain, Globe, Image, Sparkles, Check, X, Sun, Moon, ArrowLeft, ArrowRight, RotateCcw, Plus, Minus, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AIModelLogo } from "@/components/AIModelLogo";
import { MODEL_CONFIG, ModelConfig } from "@/config/modelConfig";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

// Extended model info with pricing
const modelDetails: Record<string, {
  pricing: string;
  creditsPerUse: number;
  features: string[];
  limitations: string[];
  bestFor: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'premium';
  useCases: string[];
}> = {
  'lovable-gemini-flash': {
    pricing: '1 credit/message',
    creditsPerUse: 1,
    features: ['Fast responses', 'Good for general tasks', 'Code assistance', 'Multi-language support'],
    limitations: ['Less complex reasoning', 'Shorter context'],
    bestFor: 'Quick questions & daily tasks',
    speed: 'fast',
    quality: 'standard',
    useCases: ['general', 'coding', 'quick']
  },
  'lovable-gpt5-mini': {
    pricing: '1 credit/message',
    creditsPerUse: 1,
    features: ['Lightweight & fast', 'Good coding abilities', 'Efficient processing'],
    limitations: ['Limited reasoning depth', 'Basic analysis'],
    bestFor: 'Simple coding tasks & quick answers',
    speed: 'fast',
    quality: 'standard',
    useCases: ['coding', 'quick', 'general']
  },
  'lovable-gemini-pro': {
    pricing: '2 credits/message',
    creditsPerUse: 2,
    features: ['Advanced reasoning', 'Complex analysis', 'Better context understanding', 'Detailed explanations'],
    limitations: ['Slower than Flash', 'Higher credit cost'],
    bestFor: 'Complex problems & analysis',
    speed: 'medium',
    quality: 'high',
    useCases: ['reasoning', 'analysis', 'complex']
  },
  'lovable-gpt5': {
    pricing: '3 credits/message',
    creditsPerUse: 3,
    features: ['Most capable', 'Excellent reasoning', 'Creative writing', 'Advanced coding'],
    limitations: ['Highest credit cost', 'Slower responses'],
    bestFor: 'Complex reasoning & creative tasks',
    speed: 'slow',
    quality: 'premium',
    useCases: ['reasoning', 'creative', 'complex', 'coding']
  },
  'chatgpt': {
    pricing: '2 credits/message',
    creditsPerUse: 2,
    features: ['GPT-4o powered', 'Strong general knowledge', 'Good at conversation'],
    limitations: ['Requires API key', 'Rate limited'],
    bestFor: 'General conversations & knowledge',
    speed: 'medium',
    quality: 'high',
    useCases: ['general', 'conversation', 'knowledge']
  },
  'claude': {
    pricing: '2 credits/message',
    creditsPerUse: 2,
    features: ['Thoughtful responses', 'Strong analysis', 'Good at writing'],
    limitations: ['Requires API key', 'Slower processing'],
    bestFor: 'Writing & thoughtful analysis',
    speed: 'medium',
    quality: 'high',
    useCases: ['writing', 'analysis', 'creative']
  },
  'perplexity': {
    pricing: '1 credit/message',
    creditsPerUse: 1,
    features: ['Real-time web search', 'Current information', 'Source citations'],
    limitations: ['Limited reasoning', 'Search-focused'],
    bestFor: 'Research & current events',
    speed: 'fast',
    quality: 'standard',
    useCases: ['research', 'current-events', 'quick']
  },
  'perplexity-pro': {
    pricing: '2 credits/message',
    creditsPerUse: 2,
    features: ['Multi-step reasoning', 'More sources', 'Deeper analysis'],
    limitations: ['Higher cost', 'Requires API key'],
    bestFor: 'In-depth research',
    speed: 'medium',
    quality: 'high',
    useCases: ['research', 'analysis', 'complex']
  },
  'perplexity-reasoning': {
    pricing: '3 credits/message',
    creditsPerUse: 3,
    features: ['Expert analysis', 'Multi-query research', 'Comprehensive sources'],
    limitations: ['Slowest', 'Highest cost'],
    bestFor: 'Expert-level research',
    speed: 'slow',
    quality: 'premium',
    useCases: ['research', 'complex', 'analysis']
  },
  'grok': {
    pricing: '2 credits/message',
    creditsPerUse: 2,
    features: ['Real-time knowledge', 'X/Twitter integration', 'Witty responses'],
    limitations: ['Requires API key', 'Sometimes irreverent'],
    bestFor: 'Current events & social trends',
    speed: 'medium',
    quality: 'high',
    useCases: ['current-events', 'social', 'conversation']
  },
  'uncensored-chat': {
    pricing: '1 credit/message',
    creditsPerUse: 1,
    features: ['Unfiltered responses', 'No content restrictions'],
    limitations: ['May produce harmful content', 'Use responsibly'],
    bestFor: 'Unrestricted conversations',
    speed: 'fast',
    quality: 'standard',
    useCases: ['unrestricted', 'conversation']
  },
  'gemini-flash-image': {
    pricing: '5 credits/image',
    creditsPerUse: 5,
    features: ['AI image generation', 'High quality output', 'Various styles'],
    limitations: ['Image only', 'Higher credit cost'],
    bestFor: 'Creating images & artwork',
    speed: 'medium',
    quality: 'high',
    useCases: ['image', 'creative']
  },
  'lovable-gemini-flash-image': {
    pricing: '5 credits/image',
    creditsPerUse: 5,
    features: ['AI image via Lovable Gateway', 'High quality', 'Fast generation'],
    limitations: ['Image only', 'Credit intensive'],
    bestFor: 'Quick image generation',
    speed: 'fast',
    quality: 'high',
    useCases: ['image', 'creative', 'quick']
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

// Quiz Questions
const quizQuestions = [
  {
    id: 'use-case',
    question: 'What do you primarily need the AI for?',
    options: [
      { value: 'general', label: 'General questions & conversations', icon: Bot },
      { value: 'coding', label: 'Coding & development', icon: Zap },
      { value: 'research', label: 'Research & finding information', icon: Globe },
      { value: 'creative', label: 'Creative writing & content', icon: Sparkles },
      { value: 'image', label: 'Image generation', icon: Image },
    ]
  },
  {
    id: 'speed-vs-quality',
    question: 'What matters more to you?',
    options: [
      { value: 'speed', label: 'Fast responses', icon: Zap },
      { value: 'balanced', label: 'Balance of speed & quality', icon: Scale },
      { value: 'quality', label: 'Best quality results', icon: Brain },
    ]
  },
  {
    id: 'budget',
    question: 'What\'s your credit budget per message?',
    options: [
      { value: 'low', label: '1 credit (budget-friendly)', icon: Zap },
      { value: 'medium', label: '2 credits (balanced)', icon: Scale },
      { value: 'high', label: '3+ credits (premium)', icon: Brain },
    ]
  },
  {
    id: 'complexity',
    question: 'How complex are your typical tasks?',
    options: [
      { value: 'simple', label: 'Simple questions & tasks', icon: Zap },
      { value: 'moderate', label: 'Moderate complexity', icon: Scale },
      { value: 'complex', label: 'Complex analysis & reasoning', icon: Brain },
    ]
  },
];

// Quiz Component
const ModelQuiz = ({ onSelectModel }: { onSelectModel: (modelId: string) => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [recommendedModels, setRecommendedModels] = useState<ModelConfig[]>([]);

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    if (currentStep < quizQuestions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      // Calculate recommendation
      calculateRecommendation(newAnswers);
    }
  };

  const calculateRecommendation = (answers: Record<string, string>) => {
    let scores: Record<string, number> = {};
    
    MODEL_CONFIG.forEach(model => {
      scores[model.id] = 0;
      const details = modelDetails[model.id];
      if (!details) return;

      // Use case matching
      if (answers['use-case'] === 'image' && model.category === 'image') {
        scores[model.id] += 10;
      } else if (answers['use-case'] === 'research' && model.category === 'research') {
        scores[model.id] += 10;
      } else if (answers['use-case'] === 'coding' && details.useCases.includes('coding')) {
        scores[model.id] += 8;
      } else if (answers['use-case'] === 'creative' && details.useCases.includes('creative')) {
        scores[model.id] += 8;
      } else if (answers['use-case'] === 'general' && details.useCases.includes('general')) {
        scores[model.id] += 5;
      }

      // Speed preference
      if (answers['speed-vs-quality'] === 'speed' && details.speed === 'fast') {
        scores[model.id] += 5;
      } else if (answers['speed-vs-quality'] === 'quality' && details.quality === 'premium') {
        scores[model.id] += 5;
      } else if (answers['speed-vs-quality'] === 'balanced' && details.speed === 'medium') {
        scores[model.id] += 5;
      }

      // Budget matching
      if (answers['budget'] === 'low' && details.creditsPerUse === 1) {
        scores[model.id] += 5;
      } else if (answers['budget'] === 'medium' && details.creditsPerUse === 2) {
        scores[model.id] += 5;
      } else if (answers['budget'] === 'high' && details.creditsPerUse >= 3) {
        scores[model.id] += 5;
      }

      // Complexity matching
      if (answers['complexity'] === 'simple' && details.quality === 'standard') {
        scores[model.id] += 3;
      } else if (answers['complexity'] === 'complex' && (details.quality === 'premium' || details.quality === 'high')) {
        scores[model.id] += 5;
      }

      // Lovable AI bonus
      if (model.isLovable) {
        scores[model.id] += 2;
      }
    });

    // Sort and get top 3
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => MODEL_CONFIG.find(m => m.id === id)!)
      .filter(Boolean);

    setRecommendedModels(sorted);
    setShowResult(true);
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setRecommendedModels([]);
  };

  const progress = ((currentStep + 1) / quizQuestions.length) * 100;

  if (showResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Your Recommended Models</h3>
          <p className="text-muted-foreground">Based on your preferences, here are your best matches</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {recommendedModels.map((model, index) => {
            const details = modelDetails[model.id];
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full cursor-pointer transition-all hover:border-primary/50 ${index === 0 ? 'border-primary ring-2 ring-primary/20' : ''}`}
                      onClick={() => onSelectModel(model.id)}>
                  <CardHeader className="pb-2">
                    {index === 0 && (
                      <Badge className="w-fit mb-2 bg-primary text-primary-foreground">
                        Best Match
                      </Badge>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                        <AIModelLogo modelId={model.id} size="lg" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        <CardDescription>{model.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {details && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pricing:</span>
                          <span className="font-medium text-primary">{details.pricing}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Best for:</span>
                          <span className="font-medium">{details.bestFor}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={resetQuiz} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Take Quiz Again
          </Button>
        </div>
      </motion.div>
    );
  }

  const currentQuestion = quizQuestions[currentStep];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentStep + 1} of {quizQuestions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>
          
          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const Icon = option.icon;
              const isSelected = answers[currentQuestion.id] === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-auto py-4 px-6 justify-start gap-4 text-left ${isSelected ? '' : 'hover:border-primary/50'}`}
                  onClick={() => handleAnswer(currentQuestion.id, option.value)}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {currentStep > 0 && (
        <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>
      )}
    </div>
  );
};

// Comparison Tool Component
const ModelComparison = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const availableModels = MODEL_CONFIG.filter(m => !selectedModels.includes(m.id));

  const addModel = (modelId: string) => {
    if (selectedModels.length < 3) {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const removeModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter(id => id !== modelId));
  };

  const comparisonRows = [
    { label: 'Pricing', key: 'pricing' },
    { label: 'Speed', key: 'speed' },
    { label: 'Quality', key: 'quality' },
    { label: 'Best For', key: 'bestFor' },
  ];

  return (
    <div className="space-y-6">
      {/* Model Selector */}
      <div className="flex flex-wrap gap-3">
        <span className="text-sm text-muted-foreground py-2">Select models to compare:</span>
        {availableModels.slice(0, 8).map((model) => (
          <Button
            key={model.id}
            variant="outline"
            size="sm"
            onClick={() => addModel(model.id)}
            disabled={selectedModels.length >= 3}
            className="gap-2"
          >
            <Plus className="w-3 h-3" />
            {model.name}
          </Button>
        ))}
      </div>

      {selectedModels.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 border-b border-border bg-muted/30 rounded-tl-lg">Feature</th>
                {selectedModels.map((modelId, index) => {
                  const model = MODEL_CONFIG.find(m => m.id === modelId);
                  return (
                    <th key={modelId} className={`p-4 border-b border-border bg-muted/30 min-w-[200px] ${index === selectedModels.length - 1 ? 'rounded-tr-lg' : ''}`}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <AIModelLogo modelId={modelId} size="md" />
                        </div>
                        <span className="font-semibold">{model?.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModel(modelId)}
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, rowIndex) => (
                <tr key={row.key}>
                  <td className="p-4 border-b border-border font-medium">{row.label}</td>
                  {selectedModels.map((modelId) => {
                    const details = modelDetails[modelId];
                    let value = '';
                    let badge = null;
                    
                    if (details) {
                      switch (row.key) {
                        case 'pricing':
                          value = details.pricing;
                          break;
                        case 'speed':
                          badge = speedBadge[details.speed];
                          value = badge.label;
                          break;
                        case 'quality':
                          badge = qualityBadge[details.quality];
                          value = badge.label;
                          break;
                        case 'bestFor':
                          value = details.bestFor;
                          break;
                      }
                    }
                    
                    return (
                      <td key={modelId} className="p-4 border-b border-border text-center">
                        {badge ? (
                          <Badge variant="outline" className={badge.color}>
                            {value}
                          </Badge>
                        ) : (
                          <span className={row.key === 'pricing' ? 'text-primary font-semibold' : ''}>
                            {value}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Features row */}
              <tr>
                <td className="p-4 border-b border-border font-medium align-top">Features</td>
                {selectedModels.map((modelId) => {
                  const details = modelDetails[modelId];
                  return (
                    <td key={modelId} className="p-4 border-b border-border">
                      <ul className="space-y-1">
                        {details?.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
              
              {/* Limitations row */}
              <tr>
                <td className="p-4 font-medium align-top">Limitations</td>
                {selectedModels.map((modelId) => {
                  const details = modelDetails[modelId];
                  return (
                    <td key={modelId} className="p-4">
                      <ul className="space-y-1">
                        {details?.limitations.map((limitation, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <X className="w-3 h-3 text-red-500/70 shrink-0" />
                            {limitation}
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground glass-card rounded-xl">
          <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select up to 3 models to compare their features side by side</p>
        </div>
      )}
    </div>
  );
};

export default function AIModels() {
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light' | 'both'>('both');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('browse');

  const categories = ['all', 'fast', 'reasoning', 'research', 'image'];
  
  const filteredModels = selectedCategory === 'all' 
    ? MODEL_CONFIG 
    : MODEL_CONFIG.filter(m => m.category === selectedCategory);

  const scrollToModel = (modelId: string) => {
    setActiveTab('browse');
    setSelectedCategory('all');
    // Small delay to allow tab switch
    setTimeout(() => {
      const element = document.getElementById(`model-${modelId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

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

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3">
            <TabsTrigger value="browse">Browse Models</TabsTrigger>
            <TabsTrigger value="quiz">Find Your Match</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-8">
            {/* Icon Theme Preview Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-xl"
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
                        <div key={modelId} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800">
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
                        <div key={modelId} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-100 border border-zinc-200">
                          <div className="w-9 h-9 flex items-center justify-center">
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
              className="flex flex-wrap justify-center gap-3"
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
                    id={`model-${model.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <Card className="h-full glass-card-hover border-border/50 hover:border-primary/50 transition-all duration-300 group overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {/* Icon container with proper light/dark mode background */}
                            <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
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
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="glass-card">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Find Your Perfect AI Model</CardTitle>
                  <CardDescription>
                    Answer a few questions to get personalized model recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ModelQuiz onSelectModel={scrollToModel} />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    Model Comparison
                  </CardTitle>
                  <CardDescription>
                    Compare up to 3 models side by side to find the best fit for your needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ModelComparison />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/chat">
                    <Button size="lg" className="gap-2">
                      <Bot className="w-5 h-5" />
                      Start Chatting
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Try 3 free messages as a guest, or sign in for unlimited access</p>
                </TooltipContent>
              </Tooltip>
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