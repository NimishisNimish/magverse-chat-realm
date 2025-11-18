import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, Send, CheckCircle, XCircle, Loader2, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmailRecord {
  id: string;
  user_id: string;
  sent_at: string;
  status: string;
  opened_at: string | null;
  metadata: any;
}

export default function AdminInvoiceEmailer() {
  const [loading, setLoading] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<EmailRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadEmailHistory();
    loadEligibleCount();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [emailHistory, searchTerm, statusFilter]);

  const loadEligibleCount = async () => {
    try {
      // Count users with paid invoices who opted in for invoice emails
      const { count } = await supabase
        .from('invoices')
        .select('user_id', { count: 'exact', head: true })
        .eq('status', 'paid');
      
      setEligibleCount(count || 0);
    } catch (error) {
      console.error('Error loading eligible count:', error);
    }
  };

  const loadEmailHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('email_type', 'invoice')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmailHistory(data || []);
    } catch (error) {
      console.error('Error loading email history:', error);
      toast.error('Failed to load email history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = emailHistory;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.metadata?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.metadata?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
  };

  const handleSendEmails = async () => {
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-emails', {
        body: {}
      });

      if (error) throw error;

      toast.success(`Successfully sent ${data.emailsSent || 0} invoice emails`);
      
      // Reload data
      await loadEmailHistory();
      await loadEligibleCount();
    } catch (error: any) {
      console.error('Error sending invoice emails:', error);
      toast.error(error.message || 'Failed to send invoice emails');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalSent: emailHistory.length,
    successRate: emailHistory.length > 0 
      ? Math.round((emailHistory.filter(e => e.status === 'sent').length / emailHistory.length) * 100)
      : 0,
    lastSent: emailHistory[0]?.sent_at ? format(new Date(emailHistory[0].sent_at), 'PPp') : 'Never',
    failedCount: emailHistory.filter(e => e.status === 'failed').length
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Invoice Email Manager</h1>
          <p className="text-muted-foreground">
            Send invoice emails to users and track delivery status
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{stats.lastSent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Send Emails Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Invoice Emails
            </CardTitle>
            <CardDescription>
              Trigger sending invoice emails to all eligible users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Eligible recipients: <span className="font-semibold text-foreground">{eligibleCount}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Only users with paid invoices and email preferences enabled will receive emails
                </p>
              </div>
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={loading || eligibleCount === 0}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email History */}
        <Card>
          <CardHeader>
            <CardTitle>Email Send History</CardTitle>
            <CardDescription>Recent invoice email sends and their status</CardDescription>
            
            {/* Filters */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by email or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'sent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('sent')}
                >
                  Sent
                </Button>
                <Button
                  variant={statusFilter === 'failed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('failed')}
                >
                  Failed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No email records found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Opened</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">
                        {format(new Date(record.sent_at), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'sent' ? 'default' : 'destructive'}>
                          {record.status === 'sent' ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.metadata?.invoice_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        ₹{record.metadata?.amount || 0}
                      </TableCell>
                      <TableCell>
                        {record.opened_at ? (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Opened
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not opened</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Invoice Emails?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send invoice emails to {eligibleCount} eligible users. 
              Users who have opted out of invoice emails will not receive them.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmails}>
              Send Emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
