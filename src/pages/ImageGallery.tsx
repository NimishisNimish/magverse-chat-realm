import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Palette, Camera, Sparkles, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCursor } from "@/contexts/CursorContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";

interface SavedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  style?: string;
}

const ImageGallery = () => {
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const { toast } = useToast();
  const { setCursorVariant } = useCursor();

  useEffect(() => {
    const saved = localStorage.getItem('savedImages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedImages(parsed.map((img: any) => ({
          ...img,
          timestamp: new Date(img.timestamp),
          style: img.style || 'general'
        })));
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }
  }, []);

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
    const updated = savedImages.filter(img => img.id !== imageId);
    setSavedImages(updated);
    localStorage.setItem('savedImages', JSON.stringify(updated));
    toast({
      title: "Image removed",
      description: "Removed from gallery",
    });
  };

  const categorizeImages = () => {
    const photographic = savedImages.filter(img => 
      img.style === 'photographic' || img.style === 'realistic'
    );
    const artistic = savedImages.filter(img => 
      img.style === 'artistic' || img.style === 'cartoon' || img.style === 'anime'
    );
    const general = savedImages.filter(img => 
      !img.style || (img.style !== 'photographic' && img.style !== 'realistic' && 
       img.style !== 'artistic' && img.style !== 'cartoon' && img.style !== 'anime')
    );
    
    return { photographic, artistic, general };
  };

  const { photographic, artistic, general } = categorizeImages();

  const ImageGrid = ({ images }: { images: SavedImage[] }) => (
    <ScrollArea className="h-[calc(100vh-250px)]">
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
          <p>No images in this category yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className="glass-card rounded-xl overflow-hidden group stagger-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 cursor-pointer"
                  loading="lazy"
                  onMouseEnter={() => setCursorVariant('image')}
                  onMouseLeave={() => setCursorVariant('default')}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => downloadImage(image.url, image.id)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => deleteImage(image.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {image.prompt}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(image.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressIndicator />
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <ImageIcon className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-bold gradient-text">Image Gallery</h1>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="photographic" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="artistic" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Artistic
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ImageGrid images={savedImages} />
          </TabsContent>

          <TabsContent value="photographic">
            <ImageGrid images={photographic} />
          </TabsContent>

          <TabsContent value="artistic">
            <ImageGrid images={artistic} />
          </TabsContent>

          <TabsContent value="general">
            <ImageGrid images={general} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ImageGallery;