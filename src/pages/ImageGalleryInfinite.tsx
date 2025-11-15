import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Download, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  style?: string;
}

const ImageGalleryInfinite = () => {
  const [allImages, setAllImages] = useState<SavedImage[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('savedImages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAllImages(parsed.map((img: any) => ({
          ...img,
          timestamp: new Date(img.timestamp),
          style: img.style || 'general'
        })));
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }
  }, []);

  const fetchImages = useCallback(async (page: number, pageSize: number, category: string) => {
    // Simulate async loading from localStorage with pagination
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filtered = category === 'all' 
      ? allImages 
      : allImages.filter(img => {
          if (category === 'photographic') return img.style === 'photographic' || img.style === 'realistic';
          if (category === 'artistic') return img.style === 'artistic' || img.style === 'cartoon' || img.style === 'anime';
          return !img.style || !['photographic', 'realistic', 'artistic', 'cartoon', 'anime'].includes(img.style);
        });

    const start = page * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [allImages]);

  const downloadImage = async (imageUrl: string, imageId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `magverse-image-${imageId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Image downloaded",
        description: "Your image has been saved to your device",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const deleteImage = (imageId: string) => {
    const updated = allImages.filter(img => img.id !== imageId);
    setAllImages(updated);
    localStorage.setItem('savedImages', JSON.stringify(updated));
    toast({
      title: "Image removed",
      description: "Removed from gallery",
    });
  };

  const ImageGrid = ({ category }: { category: string }) => {
    const { data: images, loading, hasMore, loadMoreRef } = useInfiniteScroll<SavedImage>({
      fetchData: (page, pageSize) => fetchImages(page, pageSize, category),
      pageSize: 12,
    });

    if (images.length === 0 && !loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
          <p>No images in this category yet</p>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className="glass-card rounded-xl overflow-hidden group stagger-item card-hover-effect"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadImage(image.url, image.id)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteImage(image.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{image.prompt}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(image.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {loading && hasMore && (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          )}
          {!hasMore && images.length > 0 && (
            <p className="text-sm text-muted-foreground">No more images to load</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressIndicator />
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold gradient-text mb-8">Image Gallery</h1>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All Images</TabsTrigger>
            <TabsTrigger value="photographic">Photographic</TabsTrigger>
            <TabsTrigger value="artistic">Artistic</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ImageGrid category="all" />
          </TabsContent>

          <TabsContent value="photographic">
            <ImageGrid category="photographic" />
          </TabsContent>

          <TabsContent value="artistic">
            <ImageGrid category="artistic" />
          </TabsContent>

          <TabsContent value="general">
            <ImageGrid category="general" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ImageGalleryInfinite;
