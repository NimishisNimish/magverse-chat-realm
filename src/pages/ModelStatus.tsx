import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Clock, Zap, Brain, Bot, Globe, Sparkles, Cpu, Star, AlertTriangle } from "lucide-react";
import { useModelHealth } from "@/hooks/useModelHealth";

interface ModelConfig {
  id: string;
  name: string;
  icon: any;
  color: string;
}

const ModelStatus = () => {
  const { getAllModelHealth, attemptRecovery } = useModelHealth();
  
  const modelConfigs: ModelConfig[] = [
    { id: "gpt-5.1", name: "GPT-5.1", icon: Bot, color: "text-accent" },
    { id: "gpt-5-mini", name: "GPT-5 Mini", icon: Sparkles, color: "text-purple-400" },
    { id: "gpt-5-nano", name: "GPT-5 Nano", icon: Star, color: "text-blue-400" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash", icon: Zap, color: "text-primary" },
    { id: "gemini-3-pro", name: "Gemini 3 Pro", icon: Brain, color: "text-secondary" },
    { id: "gemini-lite", name: "Gemini Lite", icon: Cpu, color: "text-muted-foreground" },
    { id: "claude", name: "Claude", icon: Bot, color: "text-orange-400" },
    { id: "perplexity", name: "Perplexity", icon: Globe, color: "text-green-400" },
    { id: "grok", name: "Grok", icon: Zap, color: "text-cyan-400" },
  ];

  const handleRecoveryAttempt = () => {
    modelConfigs.forEach(config => {
      attemptRecovery(config.id);
    });
  };

  useEffect(() => {
    // Attempt recovery for disabled models on mount
    handleRecoveryAttempt();
  }, []);

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Degraded</Badge>;
      case 'down':
        return <Badge className="bg-destructive/20 text-destructive border-destructive"><XCircle className="w-3 h-3 mr-1" />Down</Badge>;
    }
  };

  const getModelData = () => {
    const healthData = getAllModelHealth();
    
    return modelConfigs.map(config => {
      const health = healthData.find(h => h.id === config.id);
      
      return {
        ...config,
        status: health?.status || 'healthy',
        consecutiveFailures: health?.consecutiveFailures || 0,
        lastFailure: health?.lastFailure,
        lastSuccess: health?.lastSuccess,
        totalRequests: health?.totalRequests || 0,
        successfulRequests: health?.successfulRequests || 0,
        isDisabled: health?.isDisabled || false,
        successRate: health?.totalRequests 
          ? ((health.successfulRequests / health.totalRequests) * 100).toFixed(1)
          : 'N/A'
      };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">AI Model Status</h1>
            <p className="text-muted-foreground">Real-time health monitoring based on actual usage</p>
          </div>
          <Button onClick={handleRecoveryAttempt}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Recovery
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getModelData().map((model) => {
            const Icon = model.icon;
            const hasData = model.totalRequests > 0;
            
            return (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${model.color}`} />
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                    </div>
                    {getStatusBadge(model.status)}
                  </div>
                  <CardDescription>
                    {hasData ? (
                      <>
                        {model.lastSuccess && `Last success: ${new Date(model.lastSuccess).toLocaleTimeString()}`}
                        {model.lastFailure && model.status !== 'healthy' && (
                          <span className="text-destructive ml-2">
                            Last failure: {new Date(model.lastFailure).toLocaleTimeString()}
                          </span>
                        )}
                      </>
                    ) : (
                      'No recent usage data'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {hasData ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Requests:</span>
                          <span className="font-medium">{model.totalRequests}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Success Rate:</span>
                          <span className="font-medium">{model.successRate}%</span>
                        </div>
                        {model.consecutiveFailures > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Consecutive Failures:</span>
                            <span className="font-medium text-destructive">{model.consecutiveFailures}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium">
                            {model.isDisabled ? 'Temporarily Disabled' : 'Available'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This model hasn't been used yet. Status will appear after first usage.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About Model Health Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Operational:</strong> Model is responding successfully to requests</p>
            <p>• <strong>Degraded:</strong> Model has experienced 2+ consecutive failures but is still available</p>
            <p>• <strong>Down:</strong> Model has 3+ consecutive failures and is temporarily disabled</p>
            <p className="mt-4">Status is based on <strong>real usage data</strong> from your actual requests. Models automatically recover after successful responses. Disabled models are re-enabled after 5 minutes to test recovery.</p>
            <p className="mt-2">If a model shows degraded or down status, it's recommended to use an alternative model until it recovers.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelStatus;
