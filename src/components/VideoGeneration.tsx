import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Film, Loader2, Download, Play } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  duration: number;
}

export const VideoGeneration = () => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const { toast } = useToast();

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe what video you want to generate",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: prompt.trim(),
          duration: parseInt(duration),
          aspectRatio
        }
      });

      if (error) throw error;

      if (data.videoUrl) {
        const newVideo: GeneratedVideo = {
          id: Date.now().toString(),
          url: data.videoUrl,
          prompt: prompt.trim(),
          timestamp: new Date(),
          duration: parseInt(duration)
        };

        setGeneratedVideos(prev => [newVideo, ...prev]);
        
        toast({
          title: "Video generated!",
          description: "Your video is ready to view"
        });

        setPrompt("");
      } else {
        throw new Error("No video URL returned");
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadVideo = (video: GeneratedVideo) => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = `video-${video.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            AI Video Generation
          </CardTitle>
          <CardDescription>
            Generate videos from text descriptions using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Video Description</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate... (e.g., 'A serene sunset over the ocean with waves gently crashing')"
              className="min-h-[100px]"
              disabled={generating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <Select value={duration} onValueChange={(v: any) => setDuration(v)} disabled={generating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
              <Select value={aspectRatio} onValueChange={(v: any) => setAspectRatio(v)} disabled={generating}>
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

          <Button
            onClick={generateVideo}
            disabled={generating || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Film className="mr-2 h-4 w-4" />
                Generate Video
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Video generation costs 5 credits • Generation may take 30-60 seconds
          </p>
        </CardContent>
      </Card>

      {generatedVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Videos</CardTitle>
            <CardDescription>Your AI-generated videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-black">
                    <video
                      src={video.url}
                      controls
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm line-clamp-2">{video.prompt}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{video.duration}s</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadVideo(video)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
