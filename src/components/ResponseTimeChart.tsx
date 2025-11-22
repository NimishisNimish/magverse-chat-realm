import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity } from "lucide-react";
import { format } from "date-fns";

interface ResponseTimeData {
  date: string;
  [key: string]: string | number;
}

interface ResponseTimeChartProps {
  data: ResponseTimeData[];
  models: string[];
}

const MODEL_COLORS: { [key: string]: string } = {
  'gpt-4': 'hsl(var(--primary))',
  'gpt-4o': 'hsl(var(--primary))',
  'gpt-4o-mini': 'hsl(var(--secondary))',
  'gpt-3.5-turbo': 'hsl(var(--secondary))',
  'claude-3-5-sonnet-20241022': 'hsl(var(--accent))',
  'claude-3-5-haiku-20241022': 'hsl(var(--chart-1))',
  'claude': 'hsl(var(--accent))',
  'gemini-2.0-flash-exp': 'hsl(var(--chart-2))',
  'gemini-exp-1206': 'hsl(var(--chart-3))',
  'gemini': 'hsl(var(--chart-2))',
  'llama-3.3-70b-versatile': 'hsl(var(--chart-4))',
  'llama': 'hsl(var(--chart-4))',
  'deepseek-chat': 'hsl(var(--chart-5))',
  'deepseek': 'hsl(var(--chart-5))',
  'perplexity': 'hsl(280 100% 70%)',
  'sonar': 'hsl(280 100% 70%)',
};

export const ResponseTimeChart = ({ data, models }: ResponseTimeChartProps) => {
  const getModelColor = (model: string) => {
    return MODEL_COLORS[model] || `hsl(var(--chart-${models.indexOf(model) + 1}))`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          AI Response Time Analytics
        </CardTitle>
        <CardDescription>
          Average response times per model over the last 7 days (in seconds)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            {models.map((model) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={getModelColor(model)}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={model}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
