import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, RefreshCw, Coins, User } from 'lucide-react';
import { format } from 'date-fns';

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  verification_status: string;
  plan_type: string;
  payment_method: string;
  payment_reference: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  credits_remaining: number | null;
}

// Unified credit packages configuration
const CREDIT_PACKAGES: Record<string, number> = {
  credits_50: 50,
  credits_200: 200,
  credits_500: 500,
};

export function AdminCreditPurchases() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCreditTransactions();
  }, []);

  const loadCreditTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions where plan_type starts with 'credits_'
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('*')
        .like('plan_type', 'credits_%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (txData) {
        setTransactions(txData);
        
        // Load profiles for all users
        const userIds = [...new Set(txData.map(tx => tx.user_id))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, display_name, credits_remaining')
            .in('id', userIds);

          if (profilesData) {
            const profileMap = new Map<string, UserProfile>();
            profilesData.forEach(p => profileMap.set(p.id, p));
            setProfiles(profileMap);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading credit transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit purchases',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transactionId: string, action: 'approve' | 'reject') => {
    if (!user) return;

    try {
      setProcessing(transactionId);

      const { data, error } = await supabase.functions.invoke('admin-approve-credits', {
        body: {
          transactionId,
          action,
          adminId: user.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: action === 'approve' ? 'Credits Approved' : 'Purchase Rejected',
          description: data.message,
        });
        loadCreditTransactions();
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (error: any) {
      console.error('Error processing action:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process action',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const getCreditsFromPlan = (planType: string): number => {
    return CREDIT_PACKAGES[planType] || 0;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'verified' || status === 'approved') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    } else if (status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const pendingTransactions = transactions.filter(
    tx => tx.verification_status === 'pending_verification' || tx.status === 'pending'
  );
  const processedTransactions = transactions.filter(
    tx => tx.verification_status !== 'pending_verification' && tx.status !== 'pending'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            Credit Purchases
          </h2>
          <p className="text-muted-foreground">Approve or reject UPI credit top-up requests</p>
        </div>
        <Button onClick={loadCreditTransactions} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingTransactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {processedTransactions.filter(tx => 
                tx.verification_status === 'verified' && 
                new Date(tx.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Review and approve credit purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : pendingTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending credit purchases
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTransactions.map((tx) => {
                  const profile = profiles.get(tx.user_id);
                  const credits = getCreditsFromPlan(tx.plan_type);

                  return (
                    <Card key={tx.id} className="border-yellow-500/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {profile?.display_name || profile?.username || 'Unknown User'}
                              </span>
                              {getStatusBadge(tx.verification_status)}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Credits: </span>
                                <span className="font-bold text-primary">{credits}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Amount: </span>
                                <span className="font-bold">₹{tx.amount}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Method: </span>
                                <span>{tx.payment_method?.toUpperCase()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date: </span>
                                <span>{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</span>
                              </div>
                            </div>
                            {tx.payment_reference && (
                              <div className="text-xs text-muted-foreground">
                                Ref: {tx.payment_reference}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Current credits: {profile?.credits_remaining ?? 0}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(tx.id, 'approve')}
                              disabled={processing === tx.id}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {processing === tx.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(tx.id, 'reject')}
                              disabled={processing === tx.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Processed Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Processed</CardTitle>
          <CardDescription>Previously approved or rejected purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {processedTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No processed transactions
              </div>
            ) : (
              <div className="space-y-2">
                {processedTransactions.slice(0, 20).map((tx) => {
                  const profile = profiles.get(tx.user_id);
                  const credits = getCreditsFromPlan(tx.plan_type);

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {profile?.display_name || profile?.username || 'Unknown'}
                        </span>
                        <Badge variant="outline">{credits} credits</Badge>
                        <span className="text-sm text-muted-foreground">₹{tx.amount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(tx.verification_status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM dd')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
