import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Highlighter, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Annotation {
  id: string;
  user_id: string;
  annotation_type: 'highlight' | 'comment';
  content?: string;
  highlighted_text?: string;
  username?: string;
  created_at: string;
}

interface MessageAnnotationsProps {
  messageId: string;
  messageContent: string;
  conversationId?: string;
}

export const MessageAnnotations = ({ messageId, messageContent, conversationId }: MessageAnnotationsProps) => {
  const { user, profile } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    loadAnnotations();
    
    // Subscribe to real-time annotation updates
    if (conversationId) {
      const channel = supabase
        .channel(`annotations:${messageId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_annotations',
            filter: `message_id=eq.${messageId}`
          },
          () => {
            loadAnnotations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [messageId, conversationId]);

  const loadAnnotations = async () => {
    const { data, error } = await supabase
      .from('message_annotations')
      .select(`
        id,
        user_id,
        annotation_type,
        content,
        highlighted_text,
        created_at,
        profiles (username)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnotations(data.map(a => ({
        id: a.id,
        user_id: a.user_id,
        annotation_type: a.annotation_type as 'highlight' | 'comment',
        content: a.content,
        highlighted_text: a.highlighted_text,
        created_at: a.created_at,
        username: (a.profiles as any)?.username
      })));
    }
  };

  const addHighlight = async () => {
    if (!user) {
      toast.error('Please log in to add highlights');
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text) {
      toast.error('Please select text to highlight');
      return;
    }

    const { error } = await supabase
      .from('message_annotations')
      .insert({
        message_id: messageId,
        user_id: user.id,
        annotation_type: 'highlight',
        highlighted_text: text
      });

    if (error) {
      toast.error('Failed to add highlight');
    } else {
      toast.success('Text highlighted');
      selection?.removeAllRanges();
    }
  };

  const addComment = async () => {
    if (!user || !newComment.trim()) return;

    const { error } = await supabase
      .from('message_annotations')
      .insert({
        message_id: messageId,
        user_id: user.id,
        annotation_type: 'comment',
        content: newComment.trim(),
        highlighted_text: selectedText || undefined
      });

    if (error) {
      toast.error('Failed to add comment');
    } else {
      toast.success('Comment added');
      setNewComment('');
      setSelectedText('');
      setShowCommentDialog(false);
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    const { error } = await supabase
      .from('message_annotations')
      .delete()
      .eq('id', annotationId);

    if (error) {
      toast.error('Failed to delete annotation');
    }
  };

  const openCommentDialog = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    setSelectedText(text || '');
    setShowCommentDialog(true);
    selection?.removeAllRanges();
  };

  const highlights = annotations.filter(a => a.annotation_type === 'highlight');
  const comments = annotations.filter(a => a.annotation_type === 'comment');

  // Highlight text in message content
  let highlightedContent = messageContent;
  highlights.forEach(h => {
    if (h.highlighted_text) {
      highlightedContent = highlightedContent.replace(
        h.highlighted_text,
        `<mark class="bg-yellow-200 dark:bg-yellow-900/50">${h.highlighted_text}</mark>`
      );
    }
  });

  return (
    <div className="space-y-2">
      {/* Annotation controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={addHighlight}
          className="h-7 text-xs gap-1"
        >
          <Highlighter className="w-3 h-3" />
          Highlight
        </Button>
        
        <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={openCommentDialog}
              className="h-7 text-xs gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              Comment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
            </DialogHeader>
            {selectedText && (
              <div className="p-2 bg-muted rounded text-sm mb-2">
                <span className="font-semibold">Selected: </span>
                "{selectedText}"
              </div>
            )}
            <Textarea
              placeholder="Enter your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
            />
            <Button onClick={addComment} disabled={!newComment.trim()}>
              Add Comment
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display message with highlights */}
      {highlights.length > 0 && (
        <div 
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      )}

      {/* Display comments */}
      {comments.length > 0 && (
        <div className="space-y-2 mt-3 pl-4 border-l-2 border-muted">
          {comments.map(comment => (
            <div key={comment.id} className="text-sm space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-xs text-muted-foreground">
                    {comment.username || 'User'} • {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                  {comment.highlighted_text && (
                    <p className="text-xs text-muted-foreground italic">
                      On: "{comment.highlighted_text}"
                    </p>
                  )}
                  <p className="mt-1">{comment.content}</p>
                </div>
                {comment.user_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => deleteAnnotation(comment.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
