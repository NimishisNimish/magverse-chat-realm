import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Save, TestTube, Webhook } from 'lucide-react';

export const WebhookConfiguration = () => {
  const [slackWebhook, setSlackWebhook] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhooks')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.value) {
        const webhooks = data.value as { slack?: string; discord?: string };
        setSlackWebhook(webhooks.slack || '');
        setDiscordWebhook(webhooks.discord || '');
      }
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setInitialLoad(false);
    }
  };

  const saveWebhooks = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'webhooks',
          value: {
            slack: slackWebhook,
            discord: discordWebhook,
          },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Webhook URLs saved successfully');
    } catch (error) {
      console.error('Error saving webhooks:', error);
      toast.error('Failed to save webhook URLs');
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (type: 'slack' | 'discord') => {
    try {
      const { error } = await supabase.functions.invoke('send-model-health-alert', {
        body: {
          adminEmails: [],
          adminPhones: [],
          modelName: 'Test Model',
          status: 'recovered',
          details: 'This is a test notification to verify your webhook configuration.',
          metadata: { test: true, timestamp: new Date().toISOString() }
        }
      });

      if (error) throw error;

      toast.success(`Test notification sent to ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    } catch (error) {
      console.error(`Error testing ${type} webhook:`, error);
      toast.error(`Failed to send test notification to ${type}`);
    }
  };

  if (initialLoad) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Notifications
        </CardTitle>
        <CardDescription>
          Configure Slack and Discord webhooks to receive model health alerts in your team channels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="slack-webhook" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Slack Webhook URL
          </Label>
          <Input
            id="slack-webhook"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={slackWebhook}
            onChange={(e) => setSlackWebhook(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Create an incoming webhook at{' '}
            <a 
              href="https://api.slack.com/messaging/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              api.slack.com/messaging/webhooks
            </a>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testWebhook('slack')}
            disabled={!slackWebhook || loading}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Slack
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discord-webhook" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Discord Webhook URL
          </Label>
          <Input
            id="discord-webhook"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Create a webhook in your Discord server's channel settings
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testWebhook('discord')}
            disabled={!discordWebhook || loading}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Discord
          </Button>
        </div>

        <Button onClick={saveWebhooks} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Webhook URLs'}
        </Button>
      </CardContent>
    </Card>
  );
};
