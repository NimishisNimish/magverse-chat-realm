import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const refundReasons = [
  "Service not as expected",
  "Technical issues",
  "Accidental purchase",
  "Did not use the service",
  "Found a better alternative",
  "Other",
];

const RefundRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    reason: "",
    amount: "",
    transactionId: "",
    details: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
      setFormData(prev => ({ ...prev, contactEmail: user.email || "" }));
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setTransactions(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to submit a refund request");
      return;
    }
    
    if (!formData.reason || !formData.amount || !formData.contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.from('refund_requests').insert({
        user_id: user.id,
        reason: formData.reason,
        amount: parseFloat(formData.amount),
        transaction_id: formData.transactionId || null,
        details: formData.details || null,
        contact_email: formData.contactEmail,
        status: 'pending',
      });
      
      if (error) throw error;
      
      setSubmitted(true);
      toast.success("Refund request submitted successfully");
      
    } catch (error: any) {
      console.error('Error submitting refund request:', error);
      toast.error(error.message || "Failed to submit refund request");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-4">Please sign in to submit a refund request</p>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Request Submitted</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Your refund request has been submitted successfully. Our team will review it and get back to you within 3-5 business days.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/chat">
                <Button>Back to Chat</Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline">View Settings</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link to="/settings" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          
          <h1 className="text-3xl font-bold mb-2">Request a Refund</h1>
          <p className="text-muted-foreground mb-8">
            Please fill out the form below to submit a refund request. We'll review it and respond within 3-5 business days.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Refund *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {refundReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter the amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
              <Select
                value={formData.transactionId}
                onValueChange={(value) => setFormData({ ...formData, transactionId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a transaction" />
                </SelectTrigger>
                <SelectContent>
                  {transactions.map((tx) => (
                    <SelectItem key={tx.id} value={tx.id}>
                      ₹{tx.amount} - {new Date(tx.created_at).toLocaleDateString()} ({tx.plan_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Or enter manually below if not listed
              </p>
              <Input
                placeholder="Enter transaction ID manually"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="details">Additional Details</Label>
              <Textarea
                id="details"
                placeholder="Please provide any additional information that might help us process your request..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="your@email.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <h3 className="font-medium mb-2">Refund Policy</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Refunds are processed within 7 business days</li>
                <li>• Monthly subscriptions: Refund available within 7 days of purchase</li>
                <li>• Lifetime plans: Refund available within 30 days</li>
                <li>• Credits already used are non-refundable</li>
              </ul>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Refund Request
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default RefundRequest;
