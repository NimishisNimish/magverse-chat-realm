import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DollarSign, Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BudgetAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSpending?: number;
}

export const BudgetAlertDialog = ({
  open,
  onOpenChange,
  currentSpending = 0
}: BudgetAlertDialogProps) => {
  const [budgetLimit, setBudgetLimit] = useState("10.00");
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [existingBudget, setExistingBudget] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      loadExistingBudget();
    }
  }, [open, user]);

  const loadExistingBudget = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_budget_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        setExistingBudget(data);
        setBudgetLimit(data.budget_limit_usd.toString());
        setAlertThreshold(data.alert_threshold_percent);
      }
    } catch (error) {
      // No existing budget
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Please enter a valid budget limit");
      return;
    }

    setLoading(true);

    try {
      if (existingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from('user_budget_alerts')
          .update({
            budget_limit_usd: limit,
            alert_threshold_percent: alertThreshold,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBudget.id);

        if (error) throw error;
      } else {
        // Create new budget
        const { error } = await supabase
          .from('user_budget_alerts')
          .insert({
            user_id: user.id,
            budget_limit_usd: limit,
            alert_threshold_percent: alertThreshold,
            current_spending_usd: currentSpending,
            period_start: new Date().toISOString()
          });

        if (error) throw error;
      }

      toast.success("Budget alert saved!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast.error("Failed to save budget: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const spendingPercent = existingBudget 
    ? (existingBudget.current_spending_usd / existingBudget.budget_limit_usd) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Budget Alert Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {existingBudget && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Period</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(existingBudget.period_start).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spending</span>
                  <span className="font-semibold">
                    ${existingBudget.current_spending_usd.toFixed(2)} / ${existingBudget.budget_limit_usd.toFixed(2)}
                  </span>
                </div>
                <Progress value={spendingPercent} className="h-2" />
              </div>
              {spendingPercent >= alertThreshold && (
                <div className="flex items-center gap-2 text-sm text-yellow-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span>You've reached {Math.round(spendingPercent)}% of your budget</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="budget">Monthly Budget Limit (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="pl-9"
                placeholder="10.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set a monthly spending limit for AI model usage
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Alert Threshold</Label>
              <span className="text-sm font-semibold text-primary">{alertThreshold}%</span>
            </div>
            <Slider
              value={[alertThreshold]}
              onValueChange={(values) => setAlertThreshold(values[0])}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You'll be notified when spending reaches this percentage
            </p>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Cost Tracking</p>
                <p className="text-xs text-muted-foreground">
                  Costs are estimated based on model pricing. Actual costs may vary.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Budget"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
