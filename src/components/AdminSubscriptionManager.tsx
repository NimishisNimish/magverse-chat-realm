import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Crown, 
  CreditCard, 
  Mail, 
  Search, 
  RefreshCw,
  Send,
  FileText,
  Calendar,
  Coins
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  subscription_type: string | null;
  credits_remaining: number | null;
  monthly_credits: number | null;
  monthly_credits_used: number | null;
  subscription_expires_at: string | null;
  created_at: string | null;
  is_pro: boolean | null;
}

interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  amount: number;
  plan_type: string;
  status: string;
  issue_date: string;
  created_at: string;
}

export const AdminSubscriptionManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [showUpdatePlanDialog, setShowUpdatePlanDialog] = useState(false);
  const [showSendInvoiceDialog, setShowSendInvoiceDialog] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState(50);
  const [newPlan, setNewPlan] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadInvoices();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits_remaining: (selectedUser.credits_remaining || 0) + creditsToAdd 
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Credits Added",
        description: `Added ${creditsToAdd} credits to ${selectedUser.display_name || selectedUser.username}`,
      });
      
      setShowAddCreditsDialog(false);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser || !newPlan) return;
    
    try {
      setProcessing(true);
      
      const updates: any = {
        subscription_type: newPlan,
        is_pro: newPlan !== 'free',
      };

      if (newPlan === 'lifetime') {
        updates.subscription_expires_at = null;
      } else if (newPlan === 'monthly') {
        updates.subscription_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        updates.monthly_credits = 500;
        updates.monthly_credits_used = 0;
      } else {
        updates.monthly_credits = 0;
        updates.monthly_credits_used = 0;
        updates.credits_remaining = 5;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Plan Updated",
        description: `Updated ${selectedUser.display_name || selectedUser.username} to ${newPlan} plan`,
      });
      
      setShowUpdatePlanDialog(false);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('send-invoice-emails', {
        body: { invoiceId: invoice.id }
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent",
        description: `Invoice ${invoice.invoice_number} sent successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });

  const getSubscriptionBadge = (type: string | null) => {
    switch (type) {
      case 'lifetime':
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
      case 'monthly':
        return <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"><Calendar className="w-3 h-3 mr-1" />Yearly Pro</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const lifetimeUsers = users.filter(u => u.subscription_type === 'lifetime').length;
  const proUsers = users.filter(u => u.subscription_type === 'monthly').length;
  const freeUsers = users.filter(u => !u.subscription_type || u.subscription_type === 'free').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Lifetime Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{lifetimeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Yearly Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{proUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Free Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{freeUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={loadUsers} variant="outline" size="icon" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{user.display_name || 'No Name'}</span>
                          {getSubscriptionBadge(user.subscription_type)}
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username || user.id.substring(0, 8)}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {user.subscription_type === 'lifetime' ? '∞' : user.credits_remaining} credits
                          </span>
                          {user.subscription_type === 'monthly' && user.subscription_expires_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Expires: {format(new Date(user.subscription_expires_at), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setCreditsToAdd(50);
                            setShowAddCreditsDialog(true);
                          }}
                        >
                          <Coins className="w-4 h-4 mr-1" />
                          Add Credits
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewPlan(user.subscription_type || 'free');
                            setShowUpdatePlanDialog(true);
                          }}
                        >
                          <Crown className="w-4 h-4 mr-1" />
                          Change Plan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </CardContent>
                </Card>
              ) : (
                invoices.map((invoice) => {
                  const user = users.find(u => u.id === invoice.user_id);
                  return (
                    <Card key={invoice.id} className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{invoice.invoice_number}</span>
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {user?.display_name || user?.username || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-semibold">₹{invoice.amount}</span>
                              <span className="text-muted-foreground">{invoice.plan_type}</span>
                              <span className="text-muted-foreground">
                                {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendInvoice(invoice)}
                            disabled={processing}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Send Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Add Credits Dialog */}
      <Dialog open={showAddCreditsDialog} onOpenChange={setShowAddCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add credits to {selectedUser?.display_name || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Credits to Add</Label>
              <Select value={creditsToAdd.toString()} onValueChange={(v) => setCreditsToAdd(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 Credits</SelectItem>
                  <SelectItem value="100">100 Credits</SelectItem>
                  <SelectItem value="200">200 Credits</SelectItem>
                  <SelectItem value="500">500 Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Current balance: {selectedUser?.credits_remaining || 0} credits
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCreditsDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCredits} disabled={processing}>
              {processing ? 'Adding...' : 'Add Credits'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Plan Dialog */}
      <Dialog open={showUpdatePlanDialog} onOpenChange={setShowUpdatePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update plan for {selectedUser?.display_name || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="monthly">Yearly Pro (₹199/year)</SelectItem>
                  <SelectItem value="lifetime">Lifetime Pro (₹699)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Current plan: {selectedUser?.subscription_type || 'free'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdatePlanDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdatePlan} disabled={processing}>
              {processing ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
