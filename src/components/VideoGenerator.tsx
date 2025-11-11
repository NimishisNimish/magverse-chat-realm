import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Loader2, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface Profile {
  subscription_type?: 'free' | 'monthly' | 'yearly' | 'lifetime';
}

interface VideoGeneratorProps {
  profile: Profile | null;
  onVideoGenerated?: (videoUrl: string, prompt: string) => void;
}

export default function VideoGenerator({ profile, onVideoGenerated }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [videoModel, setVideoModel] = useState<'runway' | 'veo3'>('runway');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportResolution, setExportResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  
  const isProYearlyOrLifetime = profile?.subscription_type === 'yearly' || profile?.subscription_type === 'lifetime';

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      setStatusMessage("Initializing video generation...");
      
      // Slower, more realistic progress that doesn't artificially cap at 95%
      progressInterval = setInterval(() => {
        setProgress(prev => {
          // Slow down as we approach 90% to avoid appearing stuck
          let increment = 1;
          if (prev < 20) {
            increment = 2; // Faster at start
            setStatusMessage("Submitting request to AI...");
          } else if (prev < 40) {
            increment = 1.5;
            setStatusMessage("Processing video prompt...");
          } else if (prev < 60) {
            increment = 1;
            setStatusMessage("Generating video frames...");
          } else if (prev < 80) {
            increment = 0.5;
            setStatusMessage("Rendering video...");
          } else if (prev < 90) {
            increment = 0.3;
            setStatusMessage("Finalizing video...");
          } else {
            increment = 0.1; // Very slow near completion
            setStatusMessage("Completing generation...");
          }
          return Math.min(prev + increment, 98); // Cap at 98%, final 2% happens on completion
        });
      }, 1500); // Slower interval for more realistic feel
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isGenerating]);

  const handleGenerateVideo = async () => {
    if (!isProYearlyOrLifetime) {
      toast.error("Video generation is only available for Pro Yearly and Lifetime Pro members", {
        action: {
          label: "Upgrade",
          onClick: () => window.location.href = '/payment',
        },
      });
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a video prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);
    setProgress(0);

    try {
      console.log(`🎬 Starting video generation with ${videoModel}:`, { prompt: prompt.substring(0, 50), duration, aspectRatio });
      
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: prompt.trim(),
          duration: parseInt(duration),
          aspectRatio,
          model: videoModel,
        },
      });

      if (error) {
        console.error('❌ Video generation error:', error);
        throw error;
      }

      console.log('✅ Video generation response:', data);

      if (data.success && data.videoUrl) {
        // Immediately jump to 100% on success
        setProgress(100);
        setStatusMessage("Video ready!");
        setGeneratedVideoUrl(data.videoUrl);
        
        const modelName = videoModel === 'veo3' ? 'Google Veo 3' : 'Runway ML';
        const durationText = data.duration ? ` in ${data.duration}s` : '';
        toast.success(`Video generated successfully with ${modelName}${durationText}!`);
        
        onVideoGenerated?.(data.videoUrl, prompt);
      } else {
        console.error('❌ Invalid response:', data);
        throw new Error(data.error || 'Failed to generate video - no video URL received');
      }
    } catch (error: any) {
      console.error('❌ Error generating video:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to generate video. Please try again.';
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        errorMessage = 'API authentication failed. Please check your API keys in Settings.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = 'Video generation timed out. Try a shorter duration or simpler prompt.';
      } else if (error.message?.includes('not available') || error.message?.includes('not found')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 6000 });
      setProgress(0);
      setStatusMessage("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = async (format: 'mp4' | 'webm', resolution: string) => {
    if (!generatedVideoUrl) return;
    
    try {
      toast.info(`Downloading video as ${format.toUpperCase()} (${resolution})...`);
      const a = document.createElement('a');
      a.href = generatedVideoUrl;
      a.download = `video-${Date.now()}.${format}`;
      a.click();
      toast.success("Video download started!");
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error("Failed to download video");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Video Generator
          </div>
          {!isProYearlyOrLifetime && (
            <Link to="/payment">
              <Button variant="outline" size="sm" className="gap-2">
                <Lock className="w-4 h-4" />
                Upgrade to Pro
              </Button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProYearlyOrLifetime ? (
          <div className="p-6 rounded-lg bg-muted/50 border border-border text-center space-y-3">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Pro Feature</h3>
            <p className="text-sm text-muted-foreground">
              Video generation is only available for Pro Yearly and Lifetime Pro members
            </p>
            <Link to="/payment">
              <Button className="mt-2">
                Upgrade to Pro Yearly
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Prompt</label>
              <Textarea
                placeholder="Describe the video you want to generate... (e.g., 'A serene sunset over the ocean with waves gently crashing')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Video Model</label>
              <Select value={videoModel} onValueChange={(value: 'runway' | 'veo3') => setVideoModel(value)} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="runway">Runway ML Gen-3 Turbo</SelectItem>
                  <SelectItem value="veo3">Google Veo 3 (Experimental)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (seconds)</label>
                <Select value={duration} onValueChange={setDuration} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Aspect Ratio</label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{statusMessage}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={handleGenerateVideo} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>

            {generatedVideoUrl && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generated Video</label>
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    className="w-full rounded-lg border"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Export Options</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Format</label>
                      <Select value={exportFormat} onValueChange={(value: 'mp4' | 'webm') => setExportFormat(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mp4">MP4</SelectItem>
                          <SelectItem value="webm">WebM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Resolution</label>
                      <Select value={exportResolution} onValueChange={(value: '720p' | '1080p' | '4k') => setExportResolution(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p (HD)</SelectItem>
                          <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                          <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleDownloadVideo(exportFormat, exportResolution)}
                    className="w-full"
                    variant="secondary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download as {exportFormat.toUpperCase()} ({exportResolution})
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
