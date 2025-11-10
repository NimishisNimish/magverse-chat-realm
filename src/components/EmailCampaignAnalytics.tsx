import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MousePointerClick, TrendingUp, DollarSign, Download } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

interface CampaignMetrics {
  campaign_type: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  total_revenue: number;
  roi: number;
}

export default function EmailCampaignAnalytics() {
  const [metrics, setMetrics] = useState<CampaignMetrics[]>([]);
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .rpc('get_campaign_analytics', {
          p_campaign_type: null,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error('Error loading campaign analytics:', error);
      toast.error('Failed to load campaign analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (metrics.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Campaign Type',
      'Total Sent',
      'Opened',
      'Clicked',
      'Converted',
      'Open Rate %',
      'Click Rate %',
      'Conversion Rate %',
      'Revenue',
      'ROI %'
    ];

    const csvData = metrics.map(m => [
      m.campaign_type,
      m.total_sent,
      m.total_opened,
      m.total_clicked,
      m.total_converted,
      m.open_rate,
      m.click_rate,
      m.conversion_rate,
      m.total_revenue,
      m.roi
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-campaign-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Campaign analytics exported successfully');
  };

  const totals = metrics.reduce((acc, m) => ({
    sent: acc.sent + m.total_sent,
    opened: acc.opened + m.total_opened,
    clicked: acc.clicked + m.total_clicked,
    converted: acc.converted + m.total_converted,
    revenue: acc.revenue + m.total_revenue
  }), { sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 });

  const avgOpenRate = totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(2) : '0';
  const avgClickRate = totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(2) : '0';
  const avgConversionRate = totals.sent > 0 ? ((totals.converted / totals.sent) * 100).toFixed(2) : '0';

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading campaign analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Email Campaign Analytics</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{avgOpenRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{avgClickRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{avgConversionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">₹{totals.revenue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics}>
                <XAxis dataKey="campaign_type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_sent" name="Sent" fill="hsl(var(--primary))" />
                <Bar dataKey="total_opened" name="Opened" fill="hsl(var(--secondary))" />
                <Bar dataKey="total_clicked" name="Clicked" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rates by Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics}>
                <XAxis dataKey="campaign_type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="open_rate" name="Open Rate %" stroke="hsl(var(--primary))" />
                <Line type="monotone" dataKey="click_rate" name="Click Rate %" stroke="hsl(var(--secondary))" />
                <Line type="monotone" dataKey="conversion_rate" name="Conversion %" stroke="hsl(var(--accent))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Campaign</th>
                  <th className="text-right p-2">Sent</th>
                  <th className="text-right p-2">Opened</th>
                  <th className="text-right p-2">Clicked</th>
                  <th className="text-right p-2">Converted</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.campaign_type} className="border-b">
                    <td className="p-2 font-medium capitalize">{metric.campaign_type}</td>
                    <td className="text-right p-2">{metric.total_sent}</td>
                    <td className="text-right p-2">
                      {metric.total_opened} ({metric.open_rate}%)
                    </td>
                    <td className="text-right p-2">
                      {metric.total_clicked} ({metric.click_rate}%)
                    </td>
                    <td className="text-right p-2">
                      {metric.total_converted} ({metric.conversion_rate}%)
                    </td>
                    <td className="text-right p-2">₹{metric.total_revenue}</td>
                    <td className="text-right p-2 font-semibold">{metric.roi}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}