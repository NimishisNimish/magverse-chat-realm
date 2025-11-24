import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Image, Zap, Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdvancedFeaturesPanelProps {
  onImageGenerated?: (imageUrl: string) => void;
  onModeChange?: (mode: 'fast' | 'reasoning' | null) => void;
}

export const AdvancedFeaturesPanel = ({ 
  onImageGenerated,
  onModeChange,
}: AdvancedFeaturesPanelProps) => {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('advancedPanelOpen') === 'true';
  });
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('realistic');
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [fastMode, setFastMode] = useState(false);
  const [reasoningMode, setReasoningMode] = useState(false);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem('advancedPanelOpen', String(newState));
  };

  const handleGenerateImage = async (isRegenerate = false) => {
    const promptToUse = isRegenerate ? lastGeneratedPrompt : imagePrompt;
    
    if (!promptToUse.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter an image prompt",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Preparing prompt...');
    
    // Simulate progress with stages
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev;
        
        const stages = [
          { threshold: 20, text: 'Initializing AI model...' },
          { threshold: 40, text: 'Generating image...' },
          { threshold: 60, text: 'Applying style...' },
          { threshold: 80, text: 'Finalizing...' },
        ];
        
        const stage = stages.find(s => prev < s.threshold);
        if (stage && generationStage !== stage.text) {
          setGenerationStage(stage.text);
        }
        
        return prev + Math.random() * 10;
      });
    }, 300);

    try {
      // Enhance prompt with style
      const enhancedPrompt = `${promptToUse}, ${imageStyle} style, ultra high resolution`;
      
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: enhancedPrompt,
          selectedModels: ['gemini-flash-image'],
          generateImage: true,
        }
      });

      if (error) throw error;

      if (data?.image) {
        setLastGeneratedPrompt(promptToUse);
        setGenerationProgress(100);
        setGenerationStage('Complete!');
        onImageGenerated?.(data.image);
        if (!isRegenerate) {
          setImagePrompt('');
        }
        toast({
          title: "Image generated!",
          description: "Your image has been created successfully",
        });
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setGenerating(false);
        setGenerationProgress(0);
        setGenerationStage('');
      }, 500);
    }
  };

  const handleFastModeToggle = (checked: boolean) => {
    setFastMode(checked);
    if (checked) setReasoningMode(false);
    onModeChange?.(checked ? 'fast' : null);
  };

  const handleReasoningModeToggle = (checked: boolean) => {
    setReasoningMode(checked);
    if (checked) setFastMode(false);
    onModeChange?.(checked ? 'reasoning' : null);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <div className="border-b border-border/50">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-sm font-medium hover:bg-accent/10"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Advanced Features
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent forceMount>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Tabs defaultValue="image" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="image" className="text-xs">
                      <Image className="w-3 h-3 mr-1" />
                      Image
                    </TabsTrigger>
                    <TabsTrigger value="fast" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Fast
                    </TabsTrigger>
                    <TabsTrigger value="reasoning" className="text-xs">
                      <Brain className="w-3 h-3 mr-1" />
                      Reasoning
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="space-y-3 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="image-prompt" className="text-xs">Image Prompt</Label>
                      <Input
                        id="image-prompt"
                        placeholder="Describe the image you want to generate..."
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerateImage()}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="style" className="text-xs">Style</Label>
                      <Select value={imageStyle} onValueChange={setImageStyle}>
                        <SelectTrigger id="style" className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                    <SelectItem value="oil-painting">Oil Painting</SelectItem>
                    <SelectItem value="sketch">Pencil Sketch</SelectItem>
                  </SelectContent>
                      </Select>
                    </div>

                    {generating ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{generationStage}</span>
                          <span>{generationProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={generationProgress} className="h-2" />
                      </div>
                    ) : (
                      <>
                        <Button 
                          onClick={() => handleGenerateImage(false)}
                          disabled={!imagePrompt.trim()}
                          className="w-full"
                          size="sm"
                        >
                          Generate Image
                        </Button>
                        
                        {lastGeneratedPrompt && (
                          <Button 
                            onClick={() => handleGenerateImage(true)}
                            variant="outline"
                            className="w-full mt-2"
                            size="sm"
                          >
                            Regenerate with {imageStyle} style
                          </Button>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="fast" className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Fast Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Prioritize speed with lighter models
                        </p>
                      </div>
                      <Switch
                        checked={fastMode}
                        onCheckedChange={handleFastModeToggle}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="reasoning" className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Reasoning Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable deep logical thinking
                        </p>
                      </div>
                      <Switch
                        checked={reasoningMode}
                        onCheckedChange={handleReasoningModeToggle}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </div>
    </Collapsible>
  );
};