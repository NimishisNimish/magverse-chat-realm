import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw,
  AlertTriangle,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  MessageSquare
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RefundRequest {
  id: string;
  user_id: string;
  transaction_id: string | null;
  invoice_id: string | null;
  amount: number;
  reason: string;
  details: string | null;
  status: string;
  contact_email: string;
  created_at: string;
  updated_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

export const AdminRefundManager = () => {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadRefundRequests();
  }, []);

  const loadRefundRequests = async () => {
    try {
      setLoading(true);
      const { data: requests, error } = await supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (requests) {
        setRefundRequests(requests);
        
        // Load profile info for all users
        const userIds = [...new Set(requests.map(r => r.user_id))];
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
      console.error('Error loading refund requests:', error);
      toast({
        title: "Error",
        description: "Failed to load refund requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(requestId);
      
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, also update the transaction status
      if (action === 'approve' && selectedRequest?.transaction_id) {
        await supabase
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('id', selectedRequest.transaction_id);
      }

      toast({
        title: action === 'approve' ? "Refund Approved" : "Refund Rejected",
        description: `Refund request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
      
      setShowDetailsDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
      loadRefundRequests();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    };

    const c = config[status] || config.pending;
    const Icon = c.icon;

    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  const filteredRequests = refundRequests.filter(r => {
    const matchesSearch = searchQuery === "" ||
      profiles.get(r.user_id)?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profiles.get(r.user_id)?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contact_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = refundRequests.filter(r => r.status === 'pending').length;
  const approvedCount = refundRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = refundRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{refundRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadRefundRequests} variant="outline" size="icon" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Requests List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading refund requests...</p>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No refund requests found</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const profile = profiles.get(request.user_id);
              
              return (
                <Card key={request.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {profile?.display_name || profile?.username || "Unknown User"}
                        </CardTitle>
                        <CardDescription>{request.contact_email}</CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-bold text-lg">₹{request.amount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Reason</p>
                          <p className="text-sm font-medium line-clamp-1">{request.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Requested</p>
                          <p className="text-sm">{format(new Date(request.created_at), 'PPp')}</p>
                        </div>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailsDialog(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleProcessRefund(request.id, 'approve')}
                          size="sm"
                          className="flex-1"
                          disabled={processing === request.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleProcessRefund(request.id, 'reject')}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          disabled={processing === request.id}
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
            <DialogDescription>
              Review the refund request and take action
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <p className="font-medium">
                    {profiles.get(selectedRequest.user_id)?.display_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className="font-bold text-lg">₹{selectedRequest.amount}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Contact Email</Label>
                <p>{selectedRequest.contact_email}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="font-medium">{selectedRequest.reason}</p>
              </div>
              
              {selectedRequest.details && (
                <div>
                  <Label className="text-xs text-muted-foreground">Additional Details</Label>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRequest.details}</p>
                </div>
              )}
              
              <div>
                <Label className="text-xs text-muted-foreground">Admin Notes (Optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this refund..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsDialog(false);
                setSelectedRequest(null);
                setAdminNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleProcessRefund(selectedRequest.id, 'reject')}
              disabled={processing === selectedRequest?.id}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedRequest && handleProcessRefund(selectedRequest.id, 'approve')}
              disabled={processing === selectedRequest?.id}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRefundManager;