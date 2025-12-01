import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIModelLogo } from "./AIModelLogo";
import { Label } from "@/components/ui/label";

interface ImageGenModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const IMAGE_GEN_MODELS = [
  { id: 'lovable-gemini-flash-image', name: 'Gemini Flash (Lovable)', provider: 'Google via Lovable AI' },
  { id: 'lovable-gpt5-image', name: 'GPT-5 Image (Lovable)', provider: 'OpenAI via Lovable AI' },
  { id: 'gemini-flash-image', name: 'Gemini Flash Image', provider: 'Google Direct' },
  { id: 'chatgpt-dalle', name: 'DALL-E 3', provider: 'OpenAI Direct' },
];

export const ImageGenModelSelector = ({ value, onChange }: ImageGenModelSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Image Generation Model</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {IMAGE_GEN_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                <AIModelLogo 
                  modelId={model.id.replace('-image', '').replace('-dalle', '')} 
                  size="sm" 
                />
                <div className="flex flex-col">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.provider}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};