import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, Check, X, Clock, Search, Mail, Calendar,
  CheckCircle, XCircle, AlertCircle, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface StudentApplication {
  id: string;
  user_id: string;
  email: string;
  is_edu_email: boolean;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  created_at: string;
}

const AdminStudentTrials = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<StudentApplication | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_trial_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp || !user) return;

    setProcessing(true);
    try {
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 1); // 1 month free trial

      // Update application status
      const { error: appError } = await supabase
        .from('student_trial_applications')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          trial_start_date: trialStart.toISOString(),
          trial_end_date: trialEnd.toISOString(),
        })
        .eq('id', selectedApp.id);

      if (appError) throw appError;

      // Update user's profile to student subscription
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_type: 'student',
          is_pro: true,
          credits_remaining: 200, // Student plan credits
          monthly_credits: 200,
          subscription_expires_at: trialEnd.toISOString(),
        })
        .eq('id', selectedApp.user_id);

      if (profileError) throw profileError;

      toast.success('Student trial approved! User now has 1 month free access.');
      setSelectedApp(null);
      setActionType(null);
      fetchApplications();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast.error(error.message || 'Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('student_trial_applications')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq('id', selectedApp.id);

      if (error) throw error;

      toast.success('Application rejected');
      setSelectedApp(null);
      setActionType(null);
      setRejectionReason("");
      fetchApplications();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast.error(error.message || 'Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications = applications.filter(app =>
    app.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    eduEmails: applications.filter(a => a.is_edu_email).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-purple-400" />
            </div>
            Student Trial Applications
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and approve student trial requests with .edu email verification
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-400">{stats.eduEmails}</div>
              <div className="text-sm text-muted-foreground">.edu Emails</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Applications Table */}
        <Card className="bg-card/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>.edu?</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Trial Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-pulse">Loading applications...</div>
                    </TableCell>
                  </TableRow>
                ) : filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">No applications found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{app.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.is_edu_email ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            <Check className="w-3 h-3 mr-1" /> Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                            <AlertCircle className="w-3 h-3 mr-1" /> No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(app.created_at), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {app.trial_start_date && app.trial_end_date ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(app.trial_start_date), 'MMM d')} - {format(new Date(app.trial_end_date), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType('approve');
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType('reject');
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {app.status !== 'pending' && (
                          <span className="text-sm text-muted-foreground">
                            Reviewed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={actionType === 'approve'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Approve Student Trial
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will grant <strong>{selectedApp?.email}</strong> a 1-month free trial with 200 daily credits.
              {!selectedApp?.is_edu_email && (
                <div className="mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Warning: This email is NOT a .edu email. Please verify the student manually.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove} 
              disabled={processing}
              className="bg-green-500 hover:bg-green-600"
            >
              {processing ? 'Approving...' : 'Approve Trial'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={actionType === 'reject'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Reject Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              Reject the student trial application for <strong>{selectedApp?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject} 
              disabled={processing}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing ? 'Rejecting...' : 'Reject Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudentTrials;