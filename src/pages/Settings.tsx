import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

interface ModelStatus {
  id: string;
  name: string;
  status: 'active' | 'error' | 'checking';
  provider: string;
  message?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkModelStatus = async () => {
    setIsChecking(true);
    
    const models: ModelStatus[] = [
      { id: 'lovable-gemini-flash', name: 'Gemini Flash (Lovable)', status: 'checking', provider: 'Lovable AI' },
      { id: 'lovable-gemini-pro', name: 'Gemini Pro (Lovable)', status: 'checking', provider: 'Lovable AI' },
      { id: 'lovable-gpt5', name: 'GPT-5 (Lovable)', status: 'checking', provider: 'Lovable AI' },
      { id: 'chatgpt', name: 'ChatGPT (GPT-4o)', status: 'checking', provider: 'SUDO API' },
      { id: 'gemini', name: 'Gemini Flash', status: 'checking', provider: 'Google AI' },
      { id: 'claude', name: 'Claude 3.5 Sonnet', status: 'checking', provider: 'OpenRouter' },
      { id: 'perplexity', name: 'Perplexity', status: 'checking', provider: 'Perplexity API' },
      { id: 'grok', name: 'Grok 3.1', status: 'checking', provider: 'Groq' },
    ];

    setModelStatuses(models);

    // Check each model with a simple test message
    const updatedStatuses = await Promise.all(
      models.map(async (model) => {
        try {
          const isLovableModel = model.id.startsWith('lovable-');
          const functionName = isLovableModel ? 'lovable-ai-chat' : 'chat-with-ai';
          
          const testPayload = isLovableModel ? {
            messages: [{ role: 'user', content: 'Hello' }],
            model: model.id.replace('lovable-', 'google/gemini-2.5-'),
            stream: false
          } : {
            messages: [{ role: 'user', content: 'Hello' }],
            selectedModels: [model.id],
            stream: false
          };

          const { data, error } = await supabase.functions.invoke(functionName, {
            body: testPayload
          });

          if (error) {
            console.error(`❌ ${model.name} error:`, error);
            return {
              ...model,
              status: 'error' as const,
              message: error.message || 'Connection failed'
            };
          }

          return {
            ...model,
            status: 'active' as const,
            message: 'API key configured and working'
          };
        } catch (err) {
          console.error(`❌ ${model.name} check failed:`, err);
          return {
            ...model,
            status: 'error' as const,
            message: err instanceof Error ? err.message : 'Check failed'
          };
        }
      })
    );

    setModelStatuses(updatedStatuses);
    setIsChecking(false);
    
    const activeCount = updatedStatuses.filter(m => m.status === 'active').length;
    toast.success(`Status check complete: ${activeCount}/${updatedStatuses.length} models active`);
  };

  useEffect(() => {
    checkModelStatus();
  }, []);

  const getStatusIcon = (status: ModelStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: ModelStatus['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">API Settings</h1>
            <p className="text-muted-foreground">Monitor your AI model connections and API key status</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* API Key Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Model Status</CardTitle>
                  <CardDescription>
                    Check which AI models are configured and working
                  </CardDescription>
                </div>
                <Button 
                  onClick={checkModelStatus} 
                  disabled={isChecking}
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelStatuses.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(model.status)}
                      <div>
                        <h3 className="font-semibold">{model.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {model.provider}
                          {model.message && ` • ${model.message}`}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(model.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* API Quota Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                API Quota & Limits
              </CardTitle>
              <CardDescription>
                Important information about API usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h4 className="font-semibold text-amber-500 mb-2">Rate Limits</h4>
                <p className="text-sm text-muted-foreground">
                  Each AI provider has different rate limits. If you encounter 429 errors, you may need to:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>Wait a few moments before trying again</li>
                  <li>Upgrade your API plan with the provider</li>
                  <li>Use alternative models when one is rate-limited</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-semibold text-blue-500 mb-2">Lovable AI Gateway</h4>
                <p className="text-sm text-muted-foreground">
                  Lovable AI models use your workspace credits. Monitor usage in your Lovable dashboard:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>Check Settings → Workspace → Usage</li>
                  <li>Top up credits when running low</li>
                  <li>402 errors indicate insufficient credits</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <h4 className="font-semibold text-purple-500 mb-2">API Key Management</h4>
                <p className="text-sm text-muted-foreground">
                  To update API keys, add them to your Supabase secrets. Contact your administrator if keys need renewal.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
