import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Zap, Brain, Cpu, Bot, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const models = [
  { id: 'gemini-flash', name: 'Gemini Flash', icon: Zap, model: 'google/gemini-2.5-flash' },
  { id: 'gemini-pro', name: 'Gemini 2.5 Pro', icon: Brain, model: 'google/gemini-2.5-pro' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', icon: Sparkles, model: 'openai/gpt-5-mini' },
  { id: 'gpt-5', name: 'GPT-5', icon: Bot, model: 'openai/gpt-5' },
];

interface ModelResponse {
  model: string;
  response: string;
  loading: boolean;
  error?: string;
  responseTime?: number;
}

const ModelComparison = () => {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const isPro = profile?.is_pro || profile?.subscription_type === 'monthly' || profile?.subscription_type === 'lifetime';

  if (!isPro) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Pro Feature</CardTitle>
              <CardDescription>
                AI Model Comparison is only available for Pro users. Upgrade to compare responses from multiple AI models side-by-side!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/payment')}>
                <Zap className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleCompare = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter a prompt to compare responses.",
        variant: "destructive",
      });
      return;
    }

    setIsComparing(true);
    const initialResponses: ModelResponse[] = models.map(m => ({
      model: m.name,
      response: '',
      loading: true,
    }));
    setResponses(initialResponses);

    // Fetch responses from all models in parallel
    const promises = models.map(async (model, index) => {
      const startTime = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('lovable-ai-chat', {
          body: {
            model: model.model,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
          },
        });

        if (error) throw error;

        const responseTime = Date.now() - startTime;
        const content = data.choices?.[0]?.message?.content || 'No response';

        setResponses(prev => {
          const updated = [...prev];
          updated[index] = {
            model: model.name,
            response: content,
            loading: false,
            responseTime,
          };
          return updated;
        });
      } catch (error: any) {
        console.error(`Error with ${model.name}:`, error);
        setResponses(prev => {
          const updated = [...prev];
          updated[index] = {
            model: model.name,
            response: '',
            loading: false,
            error: error.message || 'Failed to get response',
          };
          return updated;
        });
      }
    });

    await Promise.all(promises);
    setIsComparing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">AI Model Comparison</h1>
          <p className="text-muted-foreground">
            Compare responses from different AI models side-by-side to find the best one for your needs.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enter Your Prompt</CardTitle>
            <CardDescription>
              Ask a question or provide a task to compare how different AI models respond
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="E.g., Explain quantum computing in simple terms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleCompare} 
                disabled={isComparing || !prompt.trim()}
                className="flex-1"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Compare Models
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {responses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {responses.map((response, index) => {
              const ModelIcon = models[index].icon;
              return (
                <Card key={response.model} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ModelIcon className="w-5 h-5" />
                        {response.model}
                      </CardTitle>
                      {response.responseTime && (
                        <Badge variant="outline">
                          {(response.responseTime / 1000).toFixed(2)}s
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      {response.loading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      ) : response.error ? (
                        <div className="text-destructive">
                          <p className="font-semibold">Error:</p>
                          <p className="text-sm">{response.error}</p>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{response.response}</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelComparison;
