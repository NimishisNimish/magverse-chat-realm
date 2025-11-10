import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface FeedbackData {
  id: string;
  rating: string;
  comment: string | null;
  model: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string;
    username: string;
  } | null;
}

const COLORS = {
  positive: 'hsl(142, 76%, 36%)',
  negative: 'hsl(0, 84%, 60%)'
};

export default function AdminFeedbackAnalytics() {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');

  useEffect(() => {
    loadFeedback();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-feedback')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ai_response_feedback' 
      }, () => {
        loadFeedback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_response_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const feedbackWithProfiles = (data || []).map(f => ({
        ...f,
        profiles: profileMap.get(f.user_id)
      }));
      
      setFeedback(feedbackWithProfiles as any);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: feedback.length,
    positive: feedback.filter(f => f.rating === 'positive').length,
    negative: feedback.filter(f => f.rating === 'negative').length,
    withComments: feedback.filter(f => f.comment).length,
    satisfactionRate: feedback.length > 0 
      ? Math.round((feedback.filter(f => f.rating === 'positive').length / feedback.length) * 100)
      : 0
  };

  const ratingData = [
    { name: 'Positive', value: stats.positive },
    { name: 'Negative', value: stats.negative }
  ];

  const modelData = Object.entries(
    feedback.reduce((acc, f) => {
      acc[f.model] = (acc[f.model] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number })
  ).map(([name, value]) => ({ name, value }));

  const filteredFeedback = feedback.filter(f => {
    if (filter === 'all') return true;
    return f.rating === filter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading feedback...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Response Feedback</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('positive')}
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'positive' ? 'bg-green-500 text-white' : 'bg-muted'}`}
          >
            Positive
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'negative' ? 'bg-red-500 text-white' : 'bg-muted'}`}
          >
            Negative
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Positive</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.positive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Negative</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.negative}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.satisfactionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ratingData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {ratingData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase() as 'positive' | 'negative']} />
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
            <CardTitle>Feedback by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={modelData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback ({filteredFeedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFeedback.slice(0, 20).map((item) => (
              <div key={item.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={item.rating === 'positive' ? 'default' : 'destructive'}>
                        {item.rating === 'positive' ? <ThumbsUp className="h-3 w-3 mr-1" /> : <ThumbsDown className="h-3 w-3 mr-1" />}
                        {item.rating}
                      </Badge>
                      <Badge variant="outline">{item.model}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.profiles?.display_name || 'Unknown User'}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-sm text-muted-foreground italic">"{item.comment}"</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}