import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Target, DollarSign, Activity, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface SegmentData {
  segment_type: string;
  segment_value: string;
  count: number;
}

export default function UserSegmentationDashboard() {
  const [segmentData, setSegmentData] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSegmentData();
  }, []);

  const loadSegmentData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_segments')
        .select('segment_type, segment_value');

      if (error) throw error;

      // Group by segment type and value
      const grouped = data?.reduce((acc: any, item) => {
        const key = `${item.segment_type}_${item.segment_value}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const formatted = Object.entries(grouped || {}).map(([key, count]) => {
        const [type, value] = key.split('_');
        return { segment_type: type, segment_value: value, count: count as number };
      });

      setSegmentData(formatted);
    } catch (error) {
      console.error('Error loading segment data:', error);
      toast.error('Failed to load segmentation data');
    } finally {
      setLoading(false);
    }
  };

  const updateAllSegments = async () => {
    setUpdating(true);
    try {
      // Get all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');

      if (!profiles) throw new Error('No profiles found');

      // Update segments for each user (in batches)
      let updated = 0;
      for (const profile of profiles) {
        try {
          const { error } = await supabase.rpc('update_user_segments', {
            p_user_id: profile.id
          });
          if (!error) updated++;
        } catch (err) {
          console.error(`Failed to update segments for user ${profile.id}:`, err);
        }
      }

      toast.success(`Updated segments for ${updated}/${profiles.length} users`);
      await loadSegmentData();
    } catch (error) {
      console.error('Error updating segments:', error);
      toast.error('Failed to update all segments');
    } finally {
      setUpdating(false);
    }
  };

  const usageData = segmentData.filter(d => d.segment_type === 'usage');
  const engagementData = segmentData.filter(d => d.segment_type === 'engagement');
  const valueData = segmentData.filter(d => d.segment_type === 'value');
  const subscriptionData = segmentData.filter(d => d.segment_type === 'subscription');

  const totalUsers = segmentData.reduce((sum, d) => sum + d.count, 0);
  const activeUsers = engagementData.find(d => d.segment_value === 'active')?.count || 0;
  const atRiskUsers = engagementData.find(d => d.segment_value === 'at_risk')?.count || 0;
  const heavyUsers = usageData.find(d => d.segment_value === 'heavy')?.count || 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading segmentation data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Segmentation</h2>
        <Button
          onClick={updateAllSegments}
          disabled={updating}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Updating...' : 'Refresh Segments'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Segmented</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{atRiskUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Heavy Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{heavyUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={usageData.map(d => ({ name: d.segment_value, value: d.count }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {usageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={engagementData.map(d => ({ name: d.segment_value, value: d.count }))}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={valueData.map(d => ({ name: d.segment_value, value: d.count }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {valueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subscriptionData.map(d => ({ name: d.segment_value, value: d.count }))}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Segment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Segment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(
              segmentData.reduce((acc: any, item) => {
                if (!acc[item.segment_type]) acc[item.segment_type] = [];
                acc[item.segment_type].push(item);
                return acc;
              }, {})
            ).map(([type, segments]: [string, any]) => (
              <div key={type} className="border-b pb-4 last:border-0">
                <h3 className="font-semibold capitalize mb-2">{type}</h3>
                <div className="flex flex-wrap gap-2">
                  {segments.map((seg: SegmentData) => (
                    <Badge key={seg.segment_value} variant="outline">
                      {seg.segment_value}: {seg.count}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}