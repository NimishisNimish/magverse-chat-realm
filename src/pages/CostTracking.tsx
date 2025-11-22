import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useCostTracking } from '@/hooks/useCostTracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useAdminActivityLog } from '@/hooks/useAdminActivityLog';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function CostTracking() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const { creditLogs, totalCredits, modelStats, isLoading } = useCostTracking(period);
  const { profile } = useAuth();
  
  // Log admin activity
  useAdminActivityLog({
    activityType: 'page_view',
    pagePath: '/cost-tracking',
    metadata: { page: 'Cost Tracking', period }
  });

  const pieData = modelStats.map((stat) => ({
    name: stat.model,
    value: stat.total_credits,
  }));

  const timelineData = creditLogs
    ?.reduce((acc, log) => {
      const date = new Date(log.created_at).toLocaleDateString();
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.credits += log.credits_used;
      } else {
        acc.push({ date, credits: log.credits_used });
      }
      return acc;
    }, [] as Array<{ date: string; credits: number }>)
    .reverse();

  const remainingCredits = profile?.subscription_type === 'lifetime'
    ? 'Unlimited'
    : profile?.subscription_type === 'monthly'
    ? `${500 - (profile?.monthly_credits_used || 0)} / 500 daily`
    : `${profile?.credits_remaining || 0} / 5 daily`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cost Tracking</h1>
          <p className="text-muted-foreground">
            Monitor your credit usage and optimize model selection
          </p>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCredits}</div>
              <p className="text-xs text-muted-foreground">
                {period === 'day' ? 'today' : `this ${period}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{remainingCredits}</div>
              <p className="text-xs text-muted-foreground">Available credits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Cost / Request</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creditLogs && creditLogs.length > 0
                  ? (totalCredits / creditLogs.length).toFixed(1)
                  : '0'}
              </div>
              <p className="text-xs text-muted-foreground">Credits per request</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Most Used Model</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {modelStats[0]?.model.split('-')[0] || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {modelStats[0]?.total_requests || 0} requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Credit Usage Timeline</CardTitle>
              <CardDescription>Daily credit consumption over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="credits"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
              <CardDescription>Credit distribution across models</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Model Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Model Cost Breakdown</CardTitle>
            <CardDescription>Detailed statistics for each model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modelStats.map((stat) => (
                <div
                  key={stat.model}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{stat.model}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.total_requests} requests
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Avg per request</p>
                      <Badge variant="outline">{stat.avg_credits} credits</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total used</p>
                      <Badge>{stat.total_credits} credits</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
