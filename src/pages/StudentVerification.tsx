import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  CreditCard,
  Calendar,
  Sparkles,
  ArrowRight,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";

interface TrialApplication {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  is_edu_email: boolean;
  trial_start_date: string | null;
  trial_end_date: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const StudentVerification = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<TrialApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchApplication();
    }
  }, [user]);

  const fetchApplication = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('student_trial_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setApplication(data as TrialApplication | null);
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Approved',
          description: 'Your student trial has been approved!'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Rejected',
          description: 'Unfortunately, your application was not approved.'
        };
      case 'pending':
      default:
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'Pending Review',
          description: 'Your application is being reviewed by our team.'
        };
    }
  };

  const getDaysRemaining = () => {
    if (!application?.trial_end_date) return 0;
    return Math.max(0, differenceInDays(new Date(application.trial_end_date), new Date()));
  };

  const getTrialProgress = () => {
    if (!application?.trial_start_date || !application?.trial_end_date) return 0;
    const total = differenceInDays(new Date(application.trial_end_date), new Date(application.trial_start_date));
    const elapsed = differenceInDays(new Date(), new Date(application.trial_start_date));
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your student verification status.
          </p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = application ? getStatusConfig(application.status) : null;
  const StatusIcon = statusConfig?.icon || Clock;
  const daysRemaining = getDaysRemaining();
  const trialProgress = getTrialProgress();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4 px-4 py-2 border-purple-500/30 bg-purple-500/10">
                <GraduationCap className="w-4 h-4 mr-2" />
                Student Program
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Student Verification
                </span>
              </h1>
              <p className="text-muted-foreground">
                Track your student trial application and credits
              </p>
            </div>

            {/* Profile & Credits Card */}
            <Card className="mb-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Your Account</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <Badge 
                    variant={profile?.subscription_type === 'free' ? 'secondary' : 'default'}
                    className="capitalize"
                  >
                    {profile?.subscription_type || 'Free'} Plan
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Credits Remaining */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Credits</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {profile?.credits_remaining ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Available now</p>
                  </div>

                  {/* Monthly Credits */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Monthly</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {profile?.monthly_credits ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Per month limit</p>
                  </div>

                  {/* Used This Month */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Used</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {profile?.monthly_credits_used ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">This month</p>
                  </div>

                  {/* Subscription Status */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <div className="text-lg font-bold capitalize">
                      {profile?.is_pro ? 'Pro' : 'Free'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile?.subscription_expires_at 
                        ? `Until ${format(new Date(profile.subscription_expires_at), 'MMM d')}`
                        : 'No expiry'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Status Card */}
            {application ? (
              <Card className={`border-2 ${statusConfig?.borderColor} ${statusConfig?.bgColor}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${statusConfig?.bgColor}`}>
                      <StatusIcon className={`w-6 h-6 ${statusConfig?.color}`} />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Application Status
                        <Badge variant="outline" className={statusConfig?.color}>
                          {statusConfig?.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{statusConfig?.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Application Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {application.email}
                        {application.is_edu_email && (
                          <Badge variant="secondary" className="text-xs">
                            .edu verified
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Applied On</p>
                      <p className="font-medium">
                        {format(new Date(application.created_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Trial Period (for approved applications) */}
                  {application.status === 'approved' && application.trial_start_date && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Trial Period</h4>
                          <span className={`text-sm font-medium ${daysRemaining <= 7 ? 'text-orange-500' : 'text-green-500'}`}>
                            {daysRemaining} days remaining
                          </span>
                        </div>
                        <Progress value={trialProgress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Started: {format(new Date(application.trial_start_date), 'MMM d, yyyy')}
                          </span>
                          <span>
                            Ends: {application.trial_end_date && format(new Date(application.trial_end_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Rejection Reason */}
                  {application.status === 'rejected' && application.rejection_reason && (
                    <>
                      <Separator />
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-500">Reason</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {application.rejection_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Pending Status Info */}
                  {application.status === 'pending' && (
                    <>
                      <Separator />
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-yellow-500 mt-0.5 animate-pulse" />
                          <div>
                            <p className="font-medium text-yellow-600 dark:text-yellow-400">
                              Awaiting Admin Review
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Our team will review your application within 1-2 business days. 
                              You'll receive an email once a decision is made.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* No Application Yet */
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="py-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Application Found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't applied for the student trial yet. Contact support if you're a student 
                    with a valid .edu email address.
                  </p>
                  <Button asChild>
                    <Link to="/support">
                      Contact Support
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/chat">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Chatting
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/pricing">
                  <CreditCard className="w-4 h-4 mr-2" />
                  View Plans
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default StudentVerification;
