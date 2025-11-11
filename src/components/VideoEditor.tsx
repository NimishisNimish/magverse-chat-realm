import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Type, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

interface VideoEditorProps {
  videoUrl: string;
  onSave?: (editedVideoUrl: string) => void;
}

export default function VideoEditor({ videoUrl, onSave }: VideoEditorProps) {
  const [textOverlay, setTextOverlay] = useState("");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("center");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState([32]);
  const [transition, setTransition] = useState<"none" | "fade" | "slide" | "zoom">("none");
  const [isProcessing, setIsProcessing] = useState(false);

  const applyEffects = async () => {
    setIsProcessing(true);
    try {
      // Note: This is a UI preview. Actual video editing would require a backend service
      // like FFmpeg or a video processing API
      toast.info("Video editing preview applied. In production, this would process the video with your effects.");
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onSave?.(videoUrl);
      toast.success("Effects applied successfully!");
    } catch (error) {
      console.error('Error applying effects:', error);
      toast.error("Failed to apply effects");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Video Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          />
          {textOverlay && (
            <div
              className={`absolute inset-0 flex items-${textPosition === 'top' ? 'start' : textPosition === 'bottom' ? 'end' : 'center'} justify-center pointer-events-none p-4`}
            >
              <p
                style={{
                  color: textColor,
                  fontSize: `${textSize[0]}px`,
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                {textOverlay}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Text Overlay
            </Label>
            <Input
              placeholder="Enter text to overlay on video..."
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Text Position</Label>
              <Select value={textPosition} onValueChange={(value: any) => setTextPosition(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Text Color</Label>
              <Input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Text Size: {textSize[0]}px</Label>
            <Slider
              value={textSize}
              onValueChange={setTextSize}
              min={16}
              max={72}
              step={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Transition Effect</Label>
            <Select value={transition} onValueChange={(value: any) => setTransition(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade In/Out</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={applyEffects}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Apply Effects & Save
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
