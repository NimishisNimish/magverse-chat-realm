import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Mail, Users, TrendingUp, RefreshCw, Play } from "lucide-react";

interface CronTask {
  id: string;
  name: string;
  description: string;
  schedule: string;
  task: string;
  icon: any;
}

const cronTasks: CronTask[] = [
  {
    id: 'welcome',
    name: 'Welcome Emails',
    description: 'Send welcome emails to new users',
    schedule: 'Hourly',
    task: 'welcome_emails',
    icon: Mail
  },
  {
    id: 're_engagement',
    name: 'Re-engagement Emails',
    description: 'Email inactive users (7+ days)',
    schedule: 'Daily at 10 AM',
    task: 're_engagement_emails',
    icon: Users
  },
  {
    id: 'upsell',
    name: 'Upsell Emails',
    description: 'Email heavy free-tier users',
    schedule: 'Weekly (Mondays 9 AM)',
    task: 'upsell_emails',
    icon: TrendingUp
  },
  {
    id: 'segments',
    name: 'Update Segments',
    description: 'Recalculate user segments',
    schedule: 'Daily at Midnight',
    task: 'update_segments',
    icon: RefreshCw
  }
];

export default function CronSchedulerAdmin() {
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  const runTask = async (task: string, taskName: string) => {
    setRunningTasks(prev => new Set([...prev, task]));
    
    try {
      const { data, error } = await supabase.functions.invoke('cron-scheduler', {
        body: { task }
      });

      if (error) throw error;

      toast.success(`${taskName} completed successfully`, {
        description: data?.sent 
          ? `Sent ${data.sent} emails (${data.failed || 0} failed)`
          : 'Task completed'
      });
    } catch (error: any) {
      console.error(`Error running ${taskName}:`, error);
      toast.error(`Failed to run ${taskName}`, {
        description: error.message
      });
    } finally {
      setRunningTasks(prev => {
        const next = new Set(prev);
        next.delete(task);
        return next;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Automated Tasks</CardTitle>
          </div>
          <Badge variant="outline">Manual Trigger</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          These tasks run automatically on schedule. You can also trigger them manually for testing.
        </p>
        <div className="space-y-3">
          {cronTasks.map((cronTask) => {
            const Icon = cronTask.icon;
            const isRunning = runningTasks.has(cronTask.task);
            
            return (
              <div
                key={cronTask.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{cronTask.name}</h4>
                    <p className="text-sm text-muted-foreground">{cronTask.description}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {cronTask.schedule}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTask(cronTask.task, cronTask.name)}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-semibold mb-2">Setup Instructions</h4>
          <p className="text-xs text-muted-foreground">
            To enable automatic scheduling, set up external cron jobs (via services like cron-job.org or EasyCron) 
            that call: <code className="bg-background px-1 rounded">https://pqdgpxetysqcdcjwormb.supabase.co/functions/v1/cron-scheduler</code>
            with the appropriate <code className="bg-background px-1 rounded">task</code> parameter.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}