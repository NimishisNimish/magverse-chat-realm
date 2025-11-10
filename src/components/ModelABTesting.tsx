import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trophy, Users, Zap } from "lucide-react";

interface ModelResponse {
  model: string;
  content: string;
}

interface ModelABTestingProps {
  prompt: string;
  responses: ModelResponse[];
  chatId: string;
}

export function ModelABTesting({ prompt, responses, chatId }: ModelABTestingProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only show if we have exactly 2 responses
  if (responses.length !== 2) return null;

  const handleVote = async () => {
    if (!user || !selectedWinner) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('model_comparison_votes')
        .insert({
          user_id: user.id,
          chat_id: chatId,
          prompt: prompt,
          model_a: responses[0].model,
          model_b: responses[1].model,
          winner: selectedWinner,
          reason: reason.trim() || null
        });

      if (error) throw error;

      toast.success(`Vote recorded for ${selectedWinner}!`);
      setOpen(false);
      setSelectedWinner(null);
      setReason("");
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Trophy className="h-4 w-4" />
        Vote for Best Response
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Which response is better?</DialogTitle>
            <DialogDescription>
              Help us improve by voting on which AI model gave the best response
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responses.map((response, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedWinner === response.model
                      ? 'ring-2 ring-primary shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedWinner(response.model)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {response.model}
                      {selectedWinner === response.model && (
                        <Trophy className="h-5 w-5 text-primary ml-auto" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                      {response.content.substring(0, 300)}
                      {response.content.length > 300 && '...'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedWinner && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-medium">
                  Why did you choose {selectedWinner}? (optional)
                </label>
                <Textarea
                  placeholder="e.g., More accurate, better formatting, more helpful..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVote}
                disabled={!selectedWinner || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Admin analytics component for model comparison
export function ModelComparisonAnalytics() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    loadStats();
  });

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('model_comparison_votes')
        .select('model_a, model_b, winner');

      if (error) throw error;

      // Calculate win rates
      const modelStats: any = {};
      
      data?.forEach(vote => {
        [vote.model_a, vote.model_b].forEach(model => {
          if (!modelStats[model]) {
            modelStats[model] = { wins: 0, losses: 0, total: 0 };
          }
          modelStats[model].total++;
          if (vote.winner === model) {
            modelStats[model].wins++;
          } else if (vote.winner) {
            modelStats[model].losses++;
          }
        });
      });

      const statsArray = Object.entries(modelStats).map(([model, stats]: [string, any]) => ({
        model,
        ...stats,
        winRate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : '0'
      })).sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

      setStats(statsArray);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load model comparison stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading model comparison stats...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Model A/B Testing Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => (
            <div key={stat.model} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-semibold">{stat.model}</h4>
                <p className="text-sm text-muted-foreground">
                  {stat.wins}W / {stat.losses}L ({stat.total} comparisons)
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{stat.winRate}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}