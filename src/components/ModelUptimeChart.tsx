import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { MODEL_CONFIG } from '@/config/modelConfig';

interface UptimeData {
  date: string;
  [key: string]: number | string;
}

interface Props {
  models: Array<{ id: string; name: string; color: string }>;
}

const MODEL_COLORS: Record<string, string> = {
  'chatgpt': '#f59e0b',
  'gemini': '#3b82f6',
  'claude': '#fb923c',
  'perplexity': '#22c55e',
  'grok': '#06b6d4',
  'bytez-qwen': '#a855f7',
  'bytez-phi3': '#60a5fa',
  'bytez-mistral': '#6b7280',
  'gemini-flash-image': '#ec4899',
};

export const ModelUptimeChart = ({ models }: Props) => {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<UptimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUptimeData();
  }, [period, models]);

  const loadUptimeData = async () => {
    setLoading(true);
    try {
      const days = period === '7d' ? 7 : 30;
      const startDate = subDays(new Date(), days);

      const { data: historyData, error } = await supabase
        .from('model_health_history' as any)
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by date and calculate uptime percentage per model
      const groupedByDate = new Map<string, Map<string, { total: number; healthy: number }>>();

      historyData?.forEach((record: any) => {
        const date = format(new Date(record.recorded_at), 'MMM dd');
        
        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, new Map());
        }
        
        const dateMap = groupedByDate.get(date)!;
        if (!dateMap.has(record.model_id)) {
          dateMap.set(record.model_id, { total: 0, healthy: 0 });
        }
        
        const stats = dateMap.get(record.model_id)!;
        stats.total++;
        if (record.status === 'healthy') {
          stats.healthy++;
        }
      });

      // Convert to chart data format
      const chartData: UptimeData[] = [];
      groupedByDate.forEach((modelStats, date) => {
        const dataPoint: UptimeData = { date };
        
        models.forEach(model => {
          const stats = modelStats.get(model.id);
          if (stats && stats.total > 0) {
            dataPoint[model.id] = Math.round((stats.healthy / stats.total) * 100);
          } else {
            dataPoint[model.id] = 100;
          }
        });
        
        chartData.push(dataPoint);
      });

      setData(chartData);
    } catch (error) {
      console.error('Error loading uptime data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Model Uptime History</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d')}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading uptime data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No historical data available yet. Health snapshots are saved every 5 minutes.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                label={{ 
                  value: 'Uptime %', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--foreground))' }
                }}
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                stroke="hsl(var(--border))"
              />
              <Tooltip 
                formatter={(value: number) => `${value}%`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend />
              {models.map(model => (
                <Line
                  key={model.id}
                  type="monotone"
                  dataKey={model.id}
                  name={model.name}
                  stroke={MODEL_COLORS[model.id] || '#6b7280'}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
