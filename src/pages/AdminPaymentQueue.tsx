import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, RefreshCw, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
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

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

const AdminPaymentQueue = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [planTypeFilter, setPlanTypeFilter] = useState("all");
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTransactions();
      const channel = supabase
        .channel('admin-payment-queue')
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
        .eq('verification_status', 'pending_verification')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (txData) {
        setTransactions(txData);

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
        description: "Failed to load payment queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) {
      toast({
        title: "No payments selected",
        description: "Please select at least one payment to process",
        variant: "destructive",
      });
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting these payments",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map(async (txId) => {
          const { data, error } = await supabase.functions.invoke('admin-verify-payment', {
            body: {
              transactionId: txId,
              action,
              rejectionReason: action === 'reject' ? rejectionReason : undefined,
            },
          });
          return { txId, success: !error && data?.success, error };
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      toast({
        title: `Bulk ${action} completed`,
        description: `${successCount} succeeded, ${failedCount} failed`,
        variant: failedCount > 0 ? "destructive" : "default",
      });

      setSelectedIds(new Set());
      setShowBulkRejectDialog(false);
      setRejectionReason("");
      loadTransactions();
    } catch (error: any) {
      console.error('Error processing bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to process bulk action",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelection = (txId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === "" ||
      profiles.get(tx.user_id)?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profiles.get(tx.user_id)?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPaymentMethod = paymentMethodFilter === "all" || tx.payment_method === paymentMethodFilter;
    const matchesPlanType = planTypeFilter === "all" || tx.plan_type === planTypeFilter;

    return matchesSearch && matchesPaymentMethod && matchesPlanType;
  });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payment Verification Queue</h1>
            <p className="text-muted-foreground">Review and approve pending payments</p>
          </div>
          <Button onClick={loadTransactions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{transactions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{selectedIds.size}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{filteredTransactions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Plan Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="monthly">Yearly Pro</SelectItem>
                  <SelectItem value="lifetime">Lifetime Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="mb-6 border-accent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedIds.size} payment(s) selected</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleBulkAction('approve')}
                    disabled={processing}
                    variant="default"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve All
                  </Button>
                  <Button
                    onClick={() => setShowBulkRejectDialog(true)}
                    disabled={processing}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction List */}
        <div className="space-y-4">
          {filteredTransactions.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select all visible</span>
            </div>
          )}

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading payments...</p>
              </CardContent>
            </Card>
          ) : filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending payments found</p>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((tx) => {
              const profile = profiles.get(tx.user_id);
              return (
                <Card key={tx.id} className="glass-card">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={() => toggleSelection(tx.id)}
                      />
                      <div className="flex-1 flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {profile?.display_name || profile?.username || "Unknown User"}
                          </CardTitle>
                          <CardDescription>
                            @{profile?.username || tx.user_id.substring(0, 8)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">₹{tx.amount}</Badge>
                          <Badge variant="secondary">
                            {tx.plan_type === 'monthly' ? 'Yearly Pro' : 'Lifetime Pro'}
                          </Badge>
                          <Badge variant="outline">{tx.payment_method?.toUpperCase()}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm">{format(new Date(tx.created_at), 'PPp')}</p>
                      </div>
                      {tx.payment_reference && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Reference</p>
                          <p className="text-sm">{tx.payment_reference}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedIds.size} Payment(s)</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting these payments. This will be sent to the users.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleBulkAction('reject')}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? "Processing..." : "Reject All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentQueue;
