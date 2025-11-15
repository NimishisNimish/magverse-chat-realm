import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { 
  LogIn, 
  DollarSign, 
  MessageSquare, 
  Settings, 
  Sparkles,
  Activity as ActivityIcon 
} from 'lucide-react';

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_title: string;
  activity_description: string | null;
  metadata: any;
  created_at: string;
}

const ActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user) {
      loadActivities();
      setupRealtimeSubscription();
    }
  }, [user]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchQuery, filterType]);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('user-activity-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activity_log',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        setActivities(prev => [payload.new as ActivityLog, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterActivities = () => {
    let filtered = activities;

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.activity_type === filterType);
    }

    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.activity_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.activity_description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredActivities(filtered);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="w-5 h-5" />;
      case 'payment': return <DollarSign className="w-5 h-5" />;
      case 'chat_created': return <MessageSquare className="w-5 h-5" />;
      case 'settings_changed': return <Settings className="w-5 h-5" />;
      case 'credit_used': return <Sparkles className="w-5 h-5" />;
      default: return <ActivityIcon className="w-5 h-5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-blue-500/10 text-blue-500';
      case 'payment': return 'bg-green-500/10 text-green-500';
      case 'chat_created': return 'bg-purple-500/10 text-purple-500';
      case 'settings_changed': return 'bg-orange-500/10 text-orange-500';
      case 'credit_used': return 'bg-pink-500/10 text-pink-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Activity Log</h1>
          <p className="text-muted-foreground">Track all your account activities and actions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-96"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="chat_created">Chats</SelectItem>
              <SelectItem value="settings_changed">Settings</SelectItem>
              <SelectItem value="credit_used">Credits Used</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="w-5 h-5" />
              Recent Activities
              <Badge variant="secondary">{filteredActivities.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No activities found</div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className={`p-3 rounded-full ${getColor(activity.activity_type)}`}>
                        {getIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold">{activity.activity_title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {activity.activity_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {activity.activity_description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {activity.activity_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityLog;
