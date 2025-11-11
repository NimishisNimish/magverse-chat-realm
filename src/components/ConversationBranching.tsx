import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GitBranch, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
}

interface Branch {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

interface ConversationBranchingProps {
  currentChatId: string;
  messages: Message[];
  onBranchSelect: (branchId: string) => void;
}

export const ConversationBranching = ({ currentChatId, messages, onBranchSelect }: ConversationBranchingProps) => {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchName, setBranchName] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createBranch = async () => {
    if (!user || !branchName.trim() || !selectedMessageId) {
      toast.error('Please provide a branch name and select a message');
      return;
    }

    setCreating(true);
    try {
      // Get messages up to the selected point
      const selectedMsgIndex = messages.findIndex(m => m.id === selectedMessageId);
      const branchMessages = messages.slice(0, selectedMsgIndex + 1);

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: branchName,
          created_by: user.id,
          is_public: false
        })
        .select()
        .single();

      if (convError || !newConversation) {
        throw new Error('Failed to create branch');
      }

      // Add user as participant
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: newConversation.id,
          user_id: user.id
        });

      // Copy messages to new conversation
      const messagesData = branchMessages.map((msg, idx) => ({
        conversation_id: newConversation.id,
        user_id: user.id,
        model: msg.role === 'assistant' ? 'AI' : null,
        content: msg.content,
        role: msg.role,
        parent_message_id: idx === selectedMsgIndex ? selectedMessageId : null,
        metadata: {}
      }));

      await supabase
        .from('conversation_messages')
        .insert(messagesData);

      toast.success(`Branch "${branchName}" created successfully`);
      onBranchSelect(newConversation.id);
      setShowDialog(false);
      setBranchName('');
    } catch (error: any) {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
      >
        <GitBranch className="w-4 h-4 mr-2" />
        Branch Conversation
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Create Conversation Branch
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch Name</label>
              <Input
                placeholder="Enter branch name..."
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Message to Branch From</label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {messages.map((msg, idx) => (
                  <Card
                    key={msg.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedMessageId === msg.id
                        ? 'border-accent bg-accent/10'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedMessageId(msg.id)}
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                        {msg.role === 'user' ? 'You' : 'AI'}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm line-clamp-2">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Message {idx + 1} of {messages.length}
                        </p>
                      </div>
                      {selectedMessageId === msg.id && (
                        <GitBranch className="w-4 h-4 text-accent" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={createBranch}
                disabled={creating || !branchName.trim() || !selectedMessageId}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                {creating ? 'Creating...' : 'Create Branch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
