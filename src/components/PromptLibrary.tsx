import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Save, BookOpen, Trash2, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
}

interface SavedPrompt {
  id: string;
  title: string;
  prompt_template: string;
  category: string;
  tags: string[];
  variables: any; // Using any for Supabase Json type compatibility
  usage_count: number;
  created_at: string;
}

export const PromptLibrary = ({ onSelectPrompt }: PromptLibraryProps) => {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    template: '',
    category: 'general',
    tags: [] as string[],
  });

  // Load prompts
  useEffect(() => {
    if (showDialog) {
      loadPrompts();
    }
  }, [showDialog]);

  const loadPrompts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('prompt_library')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error loading prompts:', error);
      return;
    }

    setPrompts(data || []);
  };

  // Save prompt
  const savePrompt = async () => {
    if (!user) {
      toast.error('Please log in to save prompts');
      return;
    }

    if (!newPrompt.title.trim() || !newPrompt.template.trim()) {
      toast.error('Title and template are required');
      return;
    }

    // Extract variables from template (e.g., {variable})
    const variableMatches = newPrompt.template.match(/\{([^}]+)\}/g);
    const variables: Record<string, string> = {};
    if (variableMatches) {
      variableMatches.forEach(match => {
        const varName = match.slice(1, -1);
        variables[varName] = '';
      });
    }

    const { error } = await supabase
      .from('prompt_library')
      .insert({
        user_id: user.id,
        title: newPrompt.title,
        prompt_template: newPrompt.template,
        category: newPrompt.category,
        tags: newPrompt.tags,
        variables,
        usage_count: 0,
      });

    if (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
      return;
    }

    toast.success('Prompt saved to library');
    setNewPrompt({ title: '', template: '', category: 'general', tags: [] });
    setShowSaveForm(false);
    loadPrompts();
  };

  // Use prompt with variable substitution
  const usePrompt = async (prompt: SavedPrompt) => {
    let finalPrompt = prompt.prompt_template;

    // Replace variables
    if (prompt.variables && Object.keys(prompt.variables).length > 0) {
      for (const variable of Object.keys(prompt.variables)) {
        const value = window.prompt(`Enter value for {${variable}}:`);
        if (value === null) return; // User cancelled
        finalPrompt = finalPrompt.replace(new RegExp(`\\{${variable}\\}`, 'g'), value || '');
      }
    }

    // Increment usage count
    await supabase
      .from('prompt_library')
      .update({ usage_count: (prompt.usage_count || 0) + 1 })
      .eq('id', prompt.id);

    onSelectPrompt(finalPrompt);
    setShowDialog(false);
    toast.success('Prompt loaded');
  };

  // Delete prompt
  const deletePrompt = async (promptId: string) => {
    const { error } = await supabase
      .from('prompt_library')
      .delete()
      .eq('id', promptId);

    if (error) {
      toast.error('Failed to delete prompt');
      return;
    }

    toast.success('Prompt deleted');
    loadPrompts();
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="w-4 h-4 mr-2" />
          Prompt Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Prompt Library
          </DialogTitle>
        </DialogHeader>

        {/* Toggle save form */}
        {!showSaveForm ? (
          <Button onClick={() => setShowSaveForm(true)} className="w-full mb-4">
            <Save className="w-4 h-4 mr-2" />
            Save New Prompt
          </Button>
        ) : (
          <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/30">
            <Input
              placeholder="Prompt title (e.g., 'Blog post outline')"
              value={newPrompt.title}
              onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
            />
            <Textarea
              placeholder="Prompt template (use {variable} for placeholders, e.g., 'Write a blog post about {topic}')"
              value={newPrompt.template}
              onChange={(e) => setNewPrompt({ ...newPrompt, template: e.target.value })}
              rows={4}
            />
            <Select value={newPrompt.category} onValueChange={(value) => setNewPrompt({ ...newPrompt, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={savePrompt} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Prompt
              </Button>
              <Button onClick={() => setShowSaveForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Saved prompts list */}
        <div className="space-y-3">
          {prompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No saved prompts yet</p>
              <p className="text-sm">Save your frequently used prompts for quick access</p>
            </div>
          ) : (
            prompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="p-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => usePrompt(prompt)}>
                    <h3 className="font-semibold mb-1">{prompt.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {prompt.prompt_template}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{prompt.category}</Badge>
                      {prompt.usage_count > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Used {prompt.usage_count} times
                        </span>
                      )}
                      {Object.keys(prompt.variables || {}).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {Object.keys(prompt.variables).length} variables
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePrompt(prompt.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
