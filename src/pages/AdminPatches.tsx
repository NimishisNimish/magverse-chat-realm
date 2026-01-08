import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Plus, Edit, Trash2, Eye, EyeOff, Send, Image as ImageIcon, 
  Sparkles, Calendar, Save, X, Upload, Bell, Megaphone, Rocket, Bug, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface FeatureUpdate {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  image_url: string | null;
  version: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  notify_subscribers: boolean;
  created_at: string;
}

const categories = [
  { value: 'feature', label: 'New Feature', icon: Rocket },
  { value: 'improvement', label: 'Improvement', icon: Zap },
  { value: 'bugfix', label: 'Bug Fix', icon: Bug },
  { value: 'announcement', label: 'Announcement', icon: Megaphone },
];

const AdminPatches = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<FeatureUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    image_url: '',
    version: '',
    category: 'feature',
    notify_subscribers: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      summary: '',
      image_url: '',
      version: '',
      category: 'feature',
      notify_subscribers: true,
    });
    setSelectedUpdate(null);
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.image_url || null;
    
    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('patch-images')
        .upload(fileName, imageFile);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('patch-images')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (update: FeatureUpdate) => {
    setSelectedUpdate(update);
    setForm({
      title: update.title,
      content: update.content,
      summary: update.summary || '',
      image_url: update.image_url || '',
      version: update.version || '',
      category: update.category,
      notify_subscribers: update.notify_subscribers,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      // Upload image if selected
      const imageUrl = await uploadImage();
      
      if (selectedUpdate) {
        // Update existing
        const { error } = await supabase
          .from('feature_updates')
          .update({
            title: form.title,
            content: form.content,
            summary: form.summary || null,
            image_url: imageUrl,
            version: form.version || null,
            category: form.category,
            notify_subscribers: form.notify_subscribers,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedUpdate.id);

        if (error) throw error;
        toast.success('Update saved');
      } else {
        // Create new
        const { error } = await supabase
          .from('feature_updates')
          .insert({
            title: form.title,
            content: form.content,
            summary: form.summary || null,
            image_url: imageUrl,
            version: form.version || null,
            category: form.category,
            notify_subscribers: form.notify_subscribers,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Update created');
      }

      setDialogOpen(false);
      resetForm();
      fetchUpdates();
    } catch (error: any) {
      console.error('Error saving update:', error);
      toast.error(error.message || 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (update: FeatureUpdate) => {
    setPublishing(true);
    try {
      const newPublishedState = !update.is_published;
      
      const { error } = await supabase
        .from('feature_updates')
        .update({
          is_published: newPublishedState,
          published_at: newPublishedState ? new Date().toISOString() : null,
        })
        .eq('id', update.id);

      if (error) throw error;

      // Send notification emails to subscribers if publishing and notify_subscribers is true
      if (newPublishedState && update.notify_subscribers) {
        try {
          await supabase.functions.invoke('send-patch-notification', {
            body: { updateId: update.id }
          });
          toast.success('Published and notifications sent!');
        } catch (notifyError) {
          console.error('Failed to send notifications:', notifyError);
          toast.success('Published! (Notification sending failed)');
        }
      } else {
        toast.success(newPublishedState ? 'Published!' : 'Unpublished');
      }

      fetchUpdates();
    } catch (error: any) {
      console.error('Error publishing update:', error);
      toast.error(error.message || 'Failed to publish update');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUpdate) return;

    try {
      const { error } = await supabase
        .from('feature_updates')
        .delete()
        .eq('id', selectedUpdate.id);

      if (error) throw error;
      toast.success('Update deleted');
      setDeleteDialogOpen(false);
      setSelectedUpdate(null);
      fetchUpdates();
    } catch (error: any) {
      console.error('Error deleting update:', error);
      toast.error(error.message || 'Failed to delete update');
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || Sparkles;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Feature Updates
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and publish feature updates for your users
            </p>
          </div>
          <Button 
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Update
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{updates.length}</div>
              <div className="text-sm text-muted-foreground">Total Updates</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">
                {updates.filter(u => u.is_published).length}
              </div>
              <div className="text-sm text-muted-foreground">Published</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {updates.filter(u => !u.is_published).length}
              </div>
              <div className="text-sm text-muted-foreground">Drafts</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-400">
                {updates.filter(u => u.category === 'feature').length}
              </div>
              <div className="text-sm text-muted-foreground">Features</div>
            </CardContent>
          </Card>
        </div>

        {/* Updates List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse bg-card/50">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted/30 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted/30 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : updates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No updates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first feature update to keep users informed.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Update
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {updates.map((update, index) => {
              const Icon = getCategoryIcon(update.category);
              return (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card/50 hover:border-purple-500/50 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                            <Icon className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{update.title}</h3>
                              <Badge 
                                variant={update.is_published ? "default" : "secondary"}
                                className={update.is_published ? "bg-green-500/20 text-green-400" : ""}
                              >
                                {update.is_published ? 'Published' : 'Draft'}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {update.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {update.summary || update.content.substring(0, 100)}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(update.created_at), 'MMM d, yyyy')}
                              </span>
                              {update.version && (
                                <span>v{update.version}</span>
                              )}
                              {update.notify_subscribers && (
                                <span className="flex items-center gap-1 text-purple-400">
                                  <Bell className="w-3 h-3" />
                                  Notify
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePublish(update)}
                            disabled={publishing}
                          >
                            {update.is_published ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(update)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUpdate(update);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {selectedUpdate ? 'Edit Update' : 'Create New Update'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. You can save as draft and publish later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={form.category} 
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-4 h-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version (optional)</Label>
                <Input
                  placeholder="e.g., 2.1.0"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="What's new in this update?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Summary (optional)</Label>
              <Textarea
                placeholder="Brief summary for preview cards..."
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                placeholder="Full details of the update..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Feature Image (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label 
                  htmlFor="image-upload" 
                  className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-input bg-background hover:bg-accent cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  {imageFile ? imageFile.name : 'Choose image...'}
                </label>
                {(imagePreview || form.image_url) && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setForm({ ...form, image_url: '' });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {(imagePreview || form.image_url) && (
                <img 
                  src={imagePreview || form.image_url} 
                  alt="Preview" 
                  className="w-full h-40 object-cover rounded-lg mt-2 border border-border"
                />
              )}
              {uploadingImage && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Uploading image...
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="notify"
                checked={form.notify_subscribers}
                onCheckedChange={(checked) => setForm({ ...form, notify_subscribers: checked })}
              />
              <Label htmlFor="notify" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notify newsletter subscribers when published
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {selectedUpdate ? 'Save Changes' : 'Create Draft'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedUpdate?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPatches;