import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackButtonsProps {
  messageId: string;
  chatId: string;
  model?: string;
}

export function FeedbackButtons({ messageId, chatId, model }: FeedbackButtonsProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRating = async (newRating: 'positive' | 'negative') => {
    if (!user) {
      toast.error("Please sign in to provide feedback");
      return;
    }

    setRating(newRating);
    
    // Submit rating immediately
    try {
      const { error } = await supabase
        .from('ai_response_feedback')
        .upsert({
          user_id: user.id,
          chat_id: chatId,
          message_id: messageId,
          rating: newRating,
          model: model || 'unknown'
        }, {
          onConflict: 'message_id,user_id'
        });

      if (error) throw error;
      
      toast.success(`Feedback recorded: ${newRating === 'positive' ? '👍' : '👎'}`);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
      setRating(null);
    }
  };

  const handleAddComment = async () => {
    if (!user || !rating) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('ai_response_feedback')
        .update({ 
          comment,
          updated_at: new Date().toISOString()
        })
        .eq('message_id', messageId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Comment added successfully');
      setShowCommentDialog(false);
      setComment("");
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating('positive')}
          className={rating === 'positive' ? 'text-green-500' : ''}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating('negative')}
          className={rating === 'negative' ? 'text-red-500' : ''}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
        {rating && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCommentDialog(true)}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="ml-1 text-xs">Add comment</span>
          </Button>
        )}
      </div>

      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feedback Comment</DialogTitle>
            <DialogDescription>
              Help us improve by sharing your thoughts about this response
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What could be improved? What did you like?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCommentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddComment}
                disabled={!comment.trim() || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}