import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Crown,
  Zap,
  Mail,
  Calendar,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserData {
  id: string;
  username: string;
  display_name: string;
  email: string;
  subscription_type: string;
  is_pro: boolean;
  credits_remaining: number;
  created_at: string;
  last_credit_reset: string;
  total_messages: number;
  total_chats: number;
  favorite_model: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Note: Email addresses are stored in auth.users which we cannot directly query from client
      // For simplicity, we'll use user IDs. In production, create an edge function to fetch emails.

      // Get message counts per user
      const { data: messageCounts } = await supabase
        .from('chat_messages')
        .select('user_id, count');

      // Get chat counts per user
      const { data: chatCounts } = await supabase
        .from('chat_history')
        .select('user_id, count');

      // Get favorite models (most used model per user)
      const { data: modelUsage } = await supabase
        .from('chat_messages')
        .select('user_id, model, count')
        .eq('role', 'assistant');

      // Build user data with stats
      const usersWithStats = profiles?.map(profile => {
        const messageCount = messageCounts?.find(m => m.user_id === profile.id)?.count || 0;
        const chatCount = chatCounts?.find(c => c.user_id === profile.id)?.count || 0;
        const userModels = modelUsage?.filter(m => m.user_id === profile.id) || [];
        const favoriteModel = userModels.length > 0 
          ? userModels.sort((a, b) => (b.count || 0) - (a.count || 0))[0]?.model || 'N/A'
          : 'N/A';

        return {
          ...profile,
          email: profile.id.substring(0, 8) + '...', // Show partial ID instead of email
          total_messages: messageCount as number,
          total_chats: chatCount as number,
          favorite_model: favoriteModel,
        };
      }) || [];

      setUsers(usersWithStats);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = (subscriptionType: string) => {
    switch (subscriptionType) {
      case 'lifetime':
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500"><Crown className="w-3 h-3 mr-1" />Lifetime Pro</Badge>;
      case 'monthly':
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500"><Zap className="w-3 h-3 mr-1" />Pro Monthly</Badge>;
      case 'free':
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Access Denied</CardTitle>
              <CardDescription>
                You do not have permission to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage all users and their subscriptions</p>
          </div>
          <Button onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.is_pro).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Lifetime Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.subscription_type === 'lifetime').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Monthly Subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.subscription_type === 'monthly').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, display name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Favorite Model</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.display_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">@{user.username || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(user.subscription_type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.credits_remaining === -1 ? "default" : user.credits_remaining > 0 ? "secondary" : "destructive"}>
                          {user.credits_remaining === -1 ? '∞' : user.credits_remaining}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="w-4 h-4" />
                          <span>{user.total_messages} msgs</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{user.total_chats} chats</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.favorite_model}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
