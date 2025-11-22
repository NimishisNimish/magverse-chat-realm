import { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="glass-card border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center h-[300px] text-center p-6">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Chart Loading Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Unable to display chart data. This might be temporary.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => this.setState({ hasError: false })}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
