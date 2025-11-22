import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Zap, Plus } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  description: string;
  task_type: string;
  models: string[];
  settings: Record<string, any>;
  is_system_preset: boolean;
  usage_count: number;
}

interface ModelPresetsProps {
  onPresetSelect: (preset: Preset) => void;
  selectedPresetId: string | null;
}

export const ModelPresets = ({ onPresetSelect, selectedPresetId }: ModelPresetsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: presets, isLoading } = useQuery({
    queryKey: ['model-presets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_presets')
        .select('*')
        .or(`is_system_preset.eq.true,user_id.eq.${user?.id}`)
        .order('is_system_preset', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as Preset[];
    },
    enabled: !!user,
  });

  const incrementUsageMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const { data: preset } = await supabase
        .from('model_presets')
        .select('usage_count')
        .eq('id', presetId)
        .single();
      
      const { error } = await supabase
        .from('model_presets')
        .update({ usage_count: (preset?.usage_count || 0) + 1 })
        .eq('id', presetId);
      
      if (error) throw error;
    },
  });

  const handlePresetSelect = (presetId: string) => {
    const preset = presets?.find((p) => p.id === presetId);
    if (preset) {
      onPresetSelect(preset);
      incrementUsageMutation.mutate(presetId);
      toast.success(`Activated ${preset.name}`);
    }
  };

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Quick Presets:</span>
      </div>
      
      <Select value={selectedPresetId || ''} onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a preset..." />
        </SelectTrigger>
        <SelectContent>
          {presets?.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              <div className="flex items-center gap-2">
                <span>{preset.name}</span>
                {preset.is_system_preset && (
                  <Badge variant="secondary" className="text-xs">System</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPresetId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPresetSelect(null as any)}
        >
          Clear Preset
        </Button>
      )}
    </div>
  );
};
