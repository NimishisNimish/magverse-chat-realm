import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Upload, 
  Search, 
  RefreshCw,
  Shield,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  verification_status: string;
  plan_type: string;
  payment_method: string;
  payment_reference: string | null;
  gateway_payment_id: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  auto_verified: boolean;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  email?: string;
}

const Admin = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check session storage first
    const isAuthenticated = sessionStorage.getItem('admin_authenticated');
    const loginTime = sessionStorage.getItem('admin_login_time');
    
    // Session expires after 12 hours
    const isSessionValid = loginTime && 
      (Date.now() - parseInt(loginTime)) < 12 * 60 * 60 * 1000;
    
    if (!isAuthenticated || !isSessionValid) {
      navigate('/admin-login');
      return;
    }
    
    // Then check database role
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTransactions();
      const channel = supabase
        .channel('admin-transactions')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'transactions' },
          () => loadTransactions()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
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
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (txData) {
        setTransactions(txData);
        
        // Load profile info for all users
        const userIds = [...new Set(txData.map(tx => tx.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', userIds);

        if (profilesData) {
          const profileMap = new Map();
          profilesData.forEach(p => profileMap.set(p.id, p));
          setProfiles(profileMap);
        }
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(transactionId);
      
      const { data, error } = await supabase.functions.invoke('admin-verify-payment', {
        body: {
          transactionId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: action === 'approve' ? "Payment Approved" : "Payment Rejected",
          description: data.message,
        });
        setShowRejectDialog(false);
        setRejectionReason("");
        loadTransactions();
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowRejectDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      completed: { variant: "default", icon: CheckCircle },
      pending: { variant: "secondary", icon: Clock },
      failed: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getVerificationBadge = (verificationStatus: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      verified: { variant: "default", icon: CheckCircle, label: "Verified" },
      pending_verification: { variant: "secondary", icon: Clock, label: "Pending" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    };

    const config = variants[verificationStatus] || variants.pending_verification;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === "" || 
      profiles.get(tx.user_id)?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profiles.get(tx.user_id)?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = 
      (selectedTab === "pending" && tx.verification_status === "pending_verification") ||
      (selectedTab === "verified" && tx.verification_status === "verified") ||
      (selectedTab === "rejected" && tx.verification_status === "rejected") ||
      (selectedTab === "all");

    return matchesSearch && matchesTab;
  });

  const pendingCount = transactions.filter(tx => tx.verification_status === "pending_verification").length;
  const verifiedCount = transactions.filter(tx => tx.verification_status === "verified").length;
  const rejectedCount = transactions.filter(tx => tx.verification_status === "rejected").length;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage payments and subscriptions</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/admin/advanced-analytics')} variant="outline" size="sm">
                Advanced Analytics
              </Button>
              <Button onClick={() => navigate('/admin/traffic')} variant="outline" size="sm">
                Real-Time Traffic
              </Button>
              <Button onClick={() => navigate('/admin/activity')} variant="outline" size="sm">
                User Activity
              </Button>
              <Button onClick={() => navigate('/admin/payment-queue')} variant="outline" size="sm">
                Payment Queue
              </Button>
              <Button onClick={loadTransactions} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{transactions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{verifiedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{rejectedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Transactions */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="verified">
                Verified ({verifiedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedCount})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({transactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {loading ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">Loading transactions...</p>
                      </CardContent>
                    </Card>
                  ) : filteredTransactions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No transactions found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const profile = profiles.get(tx.user_id);
                      return (
                        <Card key={tx.id} className="glass-card">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-lg">
                                  {profile?.display_name || profile?.username || "Unknown User"}
                                </CardTitle>
                                <CardDescription>
                                  @{profile?.username || tx.user_id.substring(0, 8)}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(tx.status)}
                                {getVerificationBadge(tx.verification_status)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Amount</p>
                                <p className="text-xl font-bold">₹{tx.amount}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Plan</p>
                                <Badge variant="outline">
                                  {tx.plan_type === 'monthly' ? 'Yearly Pro' : 'Lifetime Pro'}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Payment Method</p>
                                <p className="text-sm font-medium">{tx.payment_method?.toUpperCase() || 'N/A'}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Created</p>
                                <p className="text-sm">{format(new Date(tx.created_at), 'PPp')}</p>
                              </div>
                              {tx.gateway_payment_id && (
                                <div className="space-y-2 md:col-span-2">
                                  <p className="text-sm text-muted-foreground">Payment ID</p>
                                  <p className="text-sm font-mono text-xs">{tx.gateway_payment_id}</p>
                                </div>
                              )}
                              {tx.payment_reference && (
                                <div className="space-y-2 md:col-span-2">
                                  <p className="text-sm text-muted-foreground">Reference / Note</p>
                                  <p className="text-sm">{tx.payment_reference}</p>
                                </div>
                              )}
                              {tx.auto_verified && (
                                <div className="md:col-span-2">
                                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                    <CheckCircle className="w-3 h-3" />
                                    Auto-verified by gateway
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {tx.verification_status === 'pending_verification' && (
                              <div className="flex gap-2 pt-4 border-t">
                                <Button
                                  onClick={() => handleVerifyPayment(tx.id, 'approve')}
                                  disabled={processing === tx.id}
                                  className="flex-1"
                                  variant="default"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {processing === tx.id ? 'Processing...' : 'Approve'}
                                </Button>
                                <Button
                                  onClick={() => openRejectDialog(tx)}
                                  disabled={processing === tx.id}
                                  className="flex-1"
                                  variant="destructive"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment. This will be recorded for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTransaction && handleVerifyPayment(selectedTransaction.id, 'reject')}
              disabled={!rejectionReason.trim() || processing !== null}
            >
              {processing ? 'Processing...' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;