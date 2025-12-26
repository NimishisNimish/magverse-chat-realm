import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Play, Loader2, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface TestResult {
  prompt: string;
  response: string | null;
  latency: number;
  status: 'success' | 'error' | 'pending';
  statusCode?: number;
  error?: string;
}

const SAMPLE_PROMPTS = [
  "Explain what you are capable of in one paragraph.",
  "Write a short poem about freedom of expression.",
  "What makes you different from other AI assistants?",
];

export function AdminTestUncensoredAI() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runTests = async () => {
    setIsRunning(true);
    setResults(SAMPLE_PROMPTS.map(prompt => ({
      prompt,
      response: null,
      latency: 0,
      status: 'pending',
    })));

    for (let i = 0; i < SAMPLE_PROMPTS.length; i++) {
      const prompt = SAMPLE_PROMPTS[i];
      const startTime = Date.now();

      try {
        const { data, error } = await supabase.functions.invoke('chat-with-ai', {
          body: {
            messages: [{ role: 'user', content: prompt }],
            selectedModels: ['uncensored-chat'],
            stream: false,
          },
        });

        const latency = Date.now() - startTime;

        if (error) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              response: null,
              latency,
              status: 'error',
              error: error.message,
              statusCode: 500,
            } : r
          ));
        } else if (data?.responses?.[0]) {
          const response = data.responses[0];
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              response: response.response || response.error || 'No response',
              latency,
              status: response.error ? 'error' : 'success',
              statusCode: response.error ? 500 : 200,
              error: response.error,
            } : r
          ));
        } else {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              response: 'Empty response',
              latency,
              status: 'error',
              statusCode: 200,
              error: 'No response data',
            } : r
          ));
        }
      } catch (err: any) {
        const latency = Date.now() - startTime;
        setResults(prev => prev.map((r, idx) =>
          idx === i ? {
            ...r,
            response: null,
            latency,
            status: 'error',
            error: err.message || 'Unknown error',
            statusCode: 500,
          } : r
        ));
      }
    }

    setIsRunning(false);
    toast({
      title: 'Tests Complete',
      description: `Ran ${SAMPLE_PROMPTS.length} test prompts against uncensored-chat`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const avgLatency = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.latency, 0) / results.length)
    : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Test Uncensored AI
            </CardTitle>
            <CardDescription>
              Run diagnostic tests against uncensored.chat API
            </CardDescription>
          </div>
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-sm text-muted-foreground">Success</div>
              <div className="text-2xl font-bold text-green-500">{successCount}/{results.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-sm text-muted-foreground">Errors</div>
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-sm text-muted-foreground">Avg Latency</div>
              <div className="text-2xl font-bold text-primary">{avgLatency}ms</div>
            </div>
          </div>
        )}

        {/* Test Results */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Click "Run Tests" to start diagnostic tests
              </div>
            ) : (
              results.map((result, idx) => (
                <Card key={idx} className={`border ${
                  result.status === 'success' ? 'border-green-500/30' :
                  result.status === 'error' ? 'border-red-500/30' :
                  'border-yellow-500/30'
                }`}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium">Test #{idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{result.latency}ms</Badge>
                          {result.statusCode && (
                            <Badge variant={result.statusCode === 200 ? 'default' : 'destructive'}>
                              HTTP {result.statusCode}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Prompt:</div>
                        <div className="text-sm bg-muted/50 p-2 rounded">{result.prompt}</div>
                      </div>

                      {result.status !== 'pending' && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {result.error ? 'Error:' : 'Response:'}
                          </div>
                          <div className={`text-sm p-2 rounded max-h-32 overflow-auto ${
                            result.error ? 'bg-red-500/10 text-red-400' : 'bg-muted/50'
                          }`}>
                            {result.error || result.response || 'No response'}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
