import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Video, Download, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SavedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

const VideoGallery = () => {
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<SavedVideo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('savedVideos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedVideos(parsed.map((vid: any) => ({
          ...vid,
          timestamp: new Date(vid.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load saved videos:', error);
      }
    }
  }, []);

  const downloadVideo = async (videoUrl: string, videoId: string) => {
    try {
      toast({
        title: "Downloading video",
        description: "Your video download has started",
      });
      
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `magverse-video-${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Video downloaded",
        description: "Your video has been saved to your device",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download video",
        variant: "destructive",
      });
    }
  };

  const deleteVideo = (videoId: string) => {
    const updated = savedVideos.filter(vid => vid.id !== videoId);
    setSavedVideos(updated);
    localStorage.setItem('savedVideos', JSON.stringify(updated));
    toast({
      title: "Video removed",
      description: "Removed from gallery",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Video className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-bold gradient-text">Video Gallery</h1>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          {savedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Video className="w-16 h-16 mb-4 opacity-50" />
              <p>No videos generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {savedVideos.map((video) => (
                <div key={video.id} className="glass-card rounded-xl overflow-hidden group">
                  <div className="relative aspect-video bg-muted">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => downloadVideo(video.url, video.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => deleteVideo(video.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {video.prompt}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(video.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            {selectedVideo && (
              <div className="space-y-4">
                <video
                  src={selectedVideo.url}
                  controls
                  className="w-full rounded-lg"
                  autoPlay
                />
                <div>
                  <p className="text-sm text-muted-foreground">{selectedVideo.prompt}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VideoGallery;
