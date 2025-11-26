import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useModelHealth } from '@/hooks/useModelHealth';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  ExternalLink,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { MODEL_CONFIG } from '@/config/modelConfig';

const MODEL_CONFIGS = MODEL_CONFIG;

export const ModelHealthWidget = () => {
  const modelHealth = useModelHealth();
  const [allHealth, setAllHealth] = useState(modelHealth.getAllModelHealth());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Update health data every 10 seconds
    const interval = setInterval(() => {
      setAllHealth(modelHealth.getAllModelHealth());
    }, 10000);

    return () => clearInterval(interval);
  }, [modelHealth]);

  const handleTestRecovery = async (modelId: string) => {
    setTesting(true);
    await modelHealth.attemptRecovery(modelId);
    setAllHealth(modelHealth.getAllModelHealth());
    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <Activity className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string, isDisabled: boolean) => {
    if (isDisabled) {
      return <Badge variant="destructive">Disabled</Badge>;
    }
    
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Calculate summary stats
  const healthyCount = allHealth.filter(h => h.status === 'healthy' && !h.isDisabled).length;
  const degradedCount = allHealth.filter(h => h.status === 'degraded').length;
  const downCount = allHealth.filter(h => h.isDisabled).length;
  const totalModels = MODEL_CONFIGS.length;

  // Get predictive warnings (models with increasing failure rates)
  const predictiveWarnings = allHealth.filter(h => 
    h.recentFailureRate > 30 && h.status === 'healthy' && !h.isDisabled
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Model Health Monitor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/model-status">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
            <Link to="/admin/analytics">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{degradedCount}</div>
            <div className="text-xs text-muted-foreground">Degraded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{downCount}</div>
            <div className="text-xs text-muted-foreground">Down</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round((healthyCount / totalModels) * 100)}%</div>
            <div className="text-xs text-muted-foreground">Uptime</div>
          </div>
        </div>

        {/* Predictive Warnings */}
        {predictiveWarnings.length > 0 && (
          <Alert className="bg-orange-500/10 border-orange-500">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription>
              <strong>Predictive Alert:</strong> {predictiveWarnings.length} model(s) showing concerning failure trends:
              <div className="mt-2 space-y-1">
                {predictiveWarnings.map(model => (
                  <div key={model.id} className="text-sm">
                    • {model.name}: {model.recentFailureRate.toFixed(1)}% failure rate in last 10 requests
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Model Status Grid */}
        <div className="space-y-2">
          {MODEL_CONFIGS.map(config => {
            const health = allHealth.find(h => h.id === config.id);
            const modelConfig = MODEL_CONFIGS.find(m => m.id === config.id);
            
            if (!health) {
              return (
                <div key={config.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{config.name}</div>
                      <div className="text-xs text-muted-foreground">No data available</div>
                    </div>
                  </div>
                  <Badge variant="outline">Unknown</Badge>
                </div>
              );
            }

            const successRate = health.totalRequests > 0 
              ? Math.round((health.successfulRequests / health.totalRequests) * 100)
              : 100;
            
            const trend = health.recentFailureRate > 30 ? 'increasing' : 'stable';

            return (
              <div 
                key={config.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(health.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${modelConfig?.color}`}>{health.name}</span>
                      {trend === 'increasing' && (
                      <TrendingDown className="h-3 w-3 text-orange-500" />
                      )}
                      {health.status === 'healthy' && successRate === 100 && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-x-3">
                      <span>Success: {successRate}%</span>
                      <span>Avg: {health.avgResponseTime.toFixed(0)}ms</span>
                      {health.recentFailureRate > 0 && (
                        <span className="text-orange-500">Recent failures: {health.recentFailureRate.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(health.status, health.isDisabled)}
                  {health.isDisabled && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleTestRecovery(health.id)}
                      disabled={testing}
                    >
                      <RefreshCw className={`h-3 w-3 ${testing ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              setAllHealth(modelHealth.getAllModelHealth());
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          <Link to="/model-status" className="flex-1">
            <Button size="sm" variant="outline" className="w-full">
              View History
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
