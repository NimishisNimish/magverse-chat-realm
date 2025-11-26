import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Activity, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours } from "date-fns";
import { MODEL_CONFIG } from "@/config/modelConfig";

interface ModelStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  lastIncident: Date | null;
  avgResponseTime: number;
}

const PublicModelStatus = () => {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'down'>('operational');
  const [loading, setLoading] = useState(true);

  const modelConfigs = MODEL_CONFIG;

  useEffect(() => {
    loadModelStatuses();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('public-model-status')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'model_health_history'
      }, () => {
        loadModelStatuses();
      })
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(loadModelStatuses, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadModelStatuses = async () => {
    try {
      const last24Hours = subHours(new Date(), 24);

      const { data: historyData, error } = await supabase
        .from('model_health_history' as any)
        .select('*')
        .gte('recorded_at', last24Hours.toISOString())
        .order('recorded_at', { ascending: false }) as any;

      if (error) throw error;

      // Process data for each model
      const statusMap = new Map<string, ModelStatus>();

      modelConfigs.forEach(config => {
        const modelData = (historyData || []).filter((d: any) => d.model_id === config.id);
        
        if (modelData.length === 0) {
          statusMap.set(config.id, {
            id: config.id,
            name: config.name,
            status: 'operational',
            uptime: 100,
            lastIncident: null,
            avgResponseTime: 0,
          });
          return;
        }

        const totalRecords = modelData.length;
        const healthyRecords = modelData.filter((d: any) => d.status === 'healthy').length;
        const uptime = (healthyRecords / totalRecords) * 100;

        // Get latest status
        const latestRecord: any = modelData[0];
        let status: 'operational' | 'degraded' | 'down' = 'operational';
        if (latestRecord.is_disabled || latestRecord.status === 'down') {
          status = 'down';
        } else if (latestRecord.status === 'degraded') {
          status = 'degraded';
        }

        // Find last incident
        const lastIncidentRecord: any = modelData.find((d: any) => 
          d.status !== 'healthy' || d.is_disabled
        );

        statusMap.set(config.id, {
          id: config.id,
          name: config.name,
          status,
          uptime,
          lastIncident: lastIncidentRecord ? new Date(lastIncidentRecord.recorded_at) : null,
          avgResponseTime: 0,
        });
      });

      const modelStatuses = Array.from(statusMap.values());
      setModels(modelStatuses);

      // Calculate overall status
      const downCount = modelStatuses.filter(m => m.status === 'down').length;
      const degradedCount = modelStatuses.filter(m => m.status === 'degraded').length;

      if (downCount > 0) {
        setOverallStatus('down');
      } else if (degradedCount > 0) {
        setOverallStatus('degraded');
      } else {
        setOverallStatus('operational');
      }
    } catch (error) {
      console.error('Error loading model statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'operational' | 'degraded' | 'down') => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Degraded</Badge>;
      case 'down':
        return <Badge className="bg-destructive/20 text-destructive border-destructive"><XCircle className="w-3 h-3 mr-1" />Down</Badge>;
    }
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'operational': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">MagVerse AI Status</h1>
              <p className="text-muted-foreground">Real-time health monitoring for all AI models</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-2">
                <Activity className={`w-6 h-6 ${getOverallStatusColor()}`} />
                <span className="text-2xl font-bold capitalize">{overallStatus}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Last updated: {format(new Date(), 'PPpp')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading model statuses...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => {
              const config = modelConfigs.find(c => c.id === model.id);
              
              return (
                <Card key={model.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      {getStatusBadge(model.status)}
                    </div>
                    <CardDescription>{config?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Uptime */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="w-4 h-4" />
                          <span>Uptime (24h)</span>
                        </div>
                        <span className="font-semibold">{model.uptime.toFixed(2)}%</span>
                      </div>

                      {/* Last incident */}
                      {model.lastIncident && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Last incident</span>
                          </div>
                          <span className="text-sm">{format(model.lastIncident, 'PPp')}</span>
                        </div>
                      )}

                      {/* Status bar */}
                      <div className="pt-2">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              model.uptime >= 99.5 ? 'bg-green-500' :
                              model.uptime >= 95 ? 'bg-yellow-500' :
                              'bg-destructive'
                            }`}
                            style={{ width: `${model.uptime}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About This Status Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Operational:</strong> Model is responding successfully to all requests</p>
            <p>• <strong>Degraded:</strong> Model is experiencing increased failure rates or slower response times</p>
            <p>• <strong>Down:</strong> Model is currently unavailable due to repeated failures</p>
            <p className="mt-4">This page updates automatically every 30 seconds with real-time data from our AI infrastructure. Uptime percentages are calculated over the last 24 hours.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicModelStatus;
