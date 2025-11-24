import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Loader2, Activity, TrendingUp, RefreshCcw } from 'lucide-react';

interface LoadBalancerSettingsProps {
  initialConfig?: {
    autoFailoverEnabled: boolean;
    healthThreshold: number;
    maxRetries: number;
    preferenceWeight: number;
  };
}

export const LoadBalancerSettings = ({ initialConfig }: LoadBalancerSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    autoFailoverEnabled: initialConfig?.autoFailoverEnabled ?? true,
    healthThreshold: initialConfig?.healthThreshold ?? 50,
    maxRetries: initialConfig?.maxRetries ?? 3,
    preferenceWeight: initialConfig?.preferenceWeight ?? 70,
  });

  const handleSaveConfig = () => {
    setLoading(true);
    
    // Save to localStorage
    localStorage.setItem('loadBalancerConfig', JSON.stringify(config));
    
    setTimeout(() => {
      setLoading(false);
      toast.success('Load balancer settings saved successfully');
    }, 500);
  };

  const handleResetDefaults = () => {
    setConfig({
      autoFailoverEnabled: true,
      healthThreshold: 50,
      maxRetries: 3,
      preferenceWeight: 70,
    });
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Intelligent Load Balancing</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Advanced
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Configure how the system automatically routes your requests to the healthiest AI models
        </p>

        {/* Auto-Failover Toggle */}
        <div className="flex items-center justify-between py-4 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="auto-failover" className="font-medium">
              Auto-Failover
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically route to healthy models when primary models fail
            </p>
          </div>
          <Switch
            id="auto-failover"
            checked={config.autoFailoverEnabled}
            onCheckedChange={(checked) =>
              setConfig({ ...config, autoFailoverEnabled: checked })
            }
          />
        </div>

        {/* Health Threshold Slider */}
        <div className="space-y-3 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="health-threshold" className="font-medium">
              Minimum Health Score
            </Label>
            <Badge variant="secondary">{config.healthThreshold}%</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Only use models with health scores above this threshold
          </p>
          <Slider
            id="health-threshold"
            min={0}
            max={100}
            step={5}
            value={[config.healthThreshold]}
            onValueChange={(values) =>
              setConfig({ ...config, healthThreshold: values[0] })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (Any)</span>
            <span>50% (Balanced)</span>
            <span>100% (Strict)</span>
          </div>
        </div>

        {/* Max Retries Slider */}
        <div className="space-y-3 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="max-retries" className="font-medium">
              Maximum Retry Attempts
            </Label>
            <Badge variant="secondary">{config.maxRetries}x</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            How many times to retry before reporting a failure
          </p>
          <Slider
            id="max-retries"
            min={1}
            max={5}
            step={1}
            value={[config.maxRetries]}
            onValueChange={(values) =>
              setConfig({ ...config, maxRetries: values[0] })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 (Fast)</span>
            <span>3 (Balanced)</span>
            <span>5 (Reliable)</span>
          </div>
        </div>

        {/* Preference Weight Slider */}
        <div className="space-y-3 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="preference-weight" className="font-medium">
              User Preference Weight
            </Label>
            <Badge variant="secondary">{config.preferenceWeight}%</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Balance between your model preference vs health-based routing
          </p>
          <Slider
            id="preference-weight"
            min={0}
            max={100}
            step={10}
            value={[config.preferenceWeight]}
            onValueChange={(values) =>
              setConfig({ ...config, preferenceWeight: values[0] })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (Smart Only)</span>
            <span>70% (Balanced)</span>
            <span>100% (Strict Preference)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSaveConfig}
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
          <Button
            variant="outline"
            onClick={handleResetDefaults}
            disabled={loading}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Enable auto-failover with a balanced health threshold (50%) for the best experience. 
          The system will automatically route your requests to healthy models while still respecting your preferences.
        </p>
      </Card>
    </div>
  );
};
