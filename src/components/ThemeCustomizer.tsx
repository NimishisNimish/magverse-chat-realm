import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Save, RotateCcw, Download, Upload, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ColorScheme {
  name: string;
  primary: { h: number; s: number; l: number };
  secondary: { h: number; s: number; l: number };
  accent: { h: number; s: number; l: number };
}

const defaultSchemes: ColorScheme[] = [
  {
    name: "Default",
    primary: { h: 262, s: 83, l: 58 },
    secondary: { h: 221, s: 83, l: 53 },
    accent: { h: 142, s: 76, l: 36 }
  },
  {
    name: "Ocean",
    primary: { h: 199, s: 89, l: 48 },
    secondary: { h: 177, s: 70, l: 41 },
    accent: { h: 173, s: 80, l: 40 }
  },
  {
    name: "Sunset",
    primary: { h: 14, s: 91, l: 58 },
    secondary: { h: 340, s: 82, l: 52 },
    accent: { h: 45, s: 93, l: 47 }
  },
  {
    name: "Forest",
    primary: { h: 142, s: 71, l: 45 },
    secondary: { h: 88, s: 50, l: 53 },
    accent: { h: 160, s: 84, l: 39 }
  }
];

export const ThemeCustomizer = () => {
  const [open, setOpen] = useState(false);
  const [customScheme, setCustomScheme] = useState<ColorScheme>(defaultSchemes[0]);
  const [savedSchemes, setSavedSchemes] = useState<ColorScheme[]>([]);
  const [contrastRating, setContrastRating] = useState<string>("AA");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTheme();
  }, [user]);

  const loadTheme = async () => {
    // Load from localStorage first
    const saved = localStorage.getItem("customColorSchemes");
    if (saved) {
      setSavedSchemes(JSON.parse(saved));
    }

    const activeTheme = localStorage.getItem("activeColorScheme");
    if (activeTheme) {
      const theme = JSON.parse(activeTheme);
      setCustomScheme(theme);
      applyColorScheme(theme);
    }

    // If user is logged in, try to load from Supabase
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preferences, animation_preferences')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.theme_preferences) {
          const prefs = data.theme_preferences as any;
          // Convert stored HSL format to ColorScheme
          if (prefs.primary && typeof prefs.primary === 'string') {
            const parseHsl = (hslString: string) => {
              const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
              if (match) {
                return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
              }
              return { h: 262, s: 83, l: 58 };
            };

            const loadedScheme: ColorScheme = {
              name: "Saved Theme",
              primary: prefs.primary ? parseHsl(prefs.primary) : customScheme.primary,
              secondary: prefs.secondary ? parseHsl(prefs.secondary) : customScheme.secondary,
              accent: prefs.accent ? parseHsl(prefs.accent) : customScheme.accent,
            };
            
            setCustomScheme(loadedScheme);
            applyColorScheme(loadedScheme);
          }
        }
      } catch (error) {
        console.error('Error loading theme from Supabase:', error);
      }
    }
  };

  useEffect(() => {
    checkContrast();
  }, [customScheme]);

  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [
      Math.round(255 * f(0)),
      Math.round(255 * f(8)),
      Math.round(255 * f(4))
    ];
  };

  const getRelativeLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const checkContrast = () => {
    const [r, g, b] = hslToRgb(customScheme.primary.h, customScheme.primary.s, customScheme.primary.l);
    const lum1 = getRelativeLuminance(r, g, b);
    const lum2 = getRelativeLuminance(255, 255, 255); // white foreground
    
    const contrast = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    
    if (contrast >= 7) {
      setContrastRating("AAA");
    } else if (contrast >= 4.5) {
      setContrastRating("AA");
    } else {
      setContrastRating("Fail");
    }
  };

  const applyColorScheme = (scheme: ColorScheme) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `${scheme.primary.h} ${scheme.primary.s}% ${scheme.primary.l}%`);
    root.style.setProperty("--secondary", `${scheme.secondary.h} ${scheme.secondary.s}% ${scheme.secondary.l}%`);
    root.style.setProperty("--accent", `${scheme.accent.h} ${scheme.accent.s}% ${scheme.accent.l}%`);
  };

  const handleColorChange = (color: keyof ColorScheme, property: 'h' | 's' | 'l', value: number[]) => {
    const newScheme = {
      ...customScheme,
      [color]: {
        ...customScheme[color as 'primary' | 'secondary' | 'accent'],
        [property]: value[0]
      }
    };
    setCustomScheme(newScheme);
    applyColorScheme(newScheme);
  };

  const saveScheme = () => {
    const name = prompt("Enter a name for this color scheme:");
    if (!name) return;

    const newScheme = { ...customScheme, name };
    const updated = [...savedSchemes, newScheme];
    setSavedSchemes(updated);
    localStorage.setItem("customColorSchemes", JSON.stringify(updated));
    localStorage.setItem("activeColorScheme", JSON.stringify(newScheme));
    
    toast({
      title: "Color scheme saved!",
      description: `"${name}" has been saved to your collection.`,
    });
  };

  const loadScheme = (scheme: ColorScheme) => {
    setCustomScheme(scheme);
    applyColorScheme(scheme);
    localStorage.setItem("activeColorScheme", JSON.stringify(scheme));
    
    toast({
      title: "Theme applied",
      description: `"${scheme.name}" is now active.`,
    });
  };

  const resetToDefault = () => {
    loadScheme(defaultSchemes[0]);
  };

  const exportScheme = () => {
    const dataStr = JSON.stringify(customScheme, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${customScheme.name.toLowerCase().replace(/\s/g, '-')}-theme.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Theme exported",
      description: "Your color scheme has been downloaded.",
    });
  };

  const importScheme = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event: any) => {
        try {
          const imported = JSON.parse(event.target.result);
          setCustomScheme(imported);
          applyColorScheme(imported);
          
          toast({
            title: "Theme imported",
            description: `"${imported.name}" has been loaded.`,
          });
        } catch (error) {
          toast({
            title: "Import failed",
            description: "Invalid theme file.",
            variant: "destructive",
          });
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const deleteScheme = (index: number) => {
    const updated = savedSchemes.filter((_, i) => i !== index);
    setSavedSchemes(updated);
    localStorage.setItem("customColorSchemes", JSON.stringify(updated));
    
    toast({
      title: "Scheme deleted",
      description: "Color scheme removed from your collection.",
    });
  };

  const ColorSlider = ({ 
    label, 
    color, 
    property, 
    min, 
    max, 
    value 
  }: { 
    label: string; 
    color: keyof ColorScheme; 
    property: 'h' | 's' | 'l'; 
    min: number; 
    max: number;
    value: number;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(val) => handleColorChange(color, property, val)}
        className="w-full"
      />
    </div>
  );

  const ContrastBadge = () => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "AAA": "default",
      "AA": "secondary",
      "Fail": "destructive"
    };

    return (
      <Badge variant={variants[contrastRating]} className="gap-1">
        {contrastRating === "Fail" ? <AlertCircle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        {contrastRating} Contrast
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Customize theme</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme Customizer
          </SheetTitle>
          <SheetDescription>
            Create and save custom color schemes with automatic contrast checking.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="customize" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="customize" className="space-y-6 mt-6">
            {/* Live Preview */}
            <Card className="card-hover-effect">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Live Preview</span>
                    <ContrastBadge />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div 
                      className="h-16 rounded-lg transition-all"
                      style={{ 
                        backgroundColor: `hsl(${customScheme.primary.h}, ${customScheme.primary.s}%, ${customScheme.primary.l}%)`,
                      }}
                    />
                    <div 
                      className="h-16 rounded-lg transition-all"
                      style={{ 
                        backgroundColor: `hsl(${customScheme.secondary.h}, ${customScheme.secondary.s}%, ${customScheme.secondary.l}%)`,
                      }}
                    />
                    <div 
                      className="h-16 rounded-lg transition-all"
                      style={{ 
                        backgroundColor: `hsl(${customScheme.accent.h}, ${customScheme.accent.s}%, ${customScheme.accent.l}%)`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Primary Color */}
            <div className="space-y-4">
              <h3 className="font-semibold">Primary Color</h3>
              <ColorSlider label="Hue" color="primary" property="h" min={0} max={360} value={customScheme.primary.h} />
              <ColorSlider label="Saturation" color="primary" property="s" min={0} max={100} value={customScheme.primary.s} />
              <ColorSlider label="Lightness" color="primary" property="l" min={0} max={100} value={customScheme.primary.l} />
            </div>

            {/* Secondary Color */}
            <div className="space-y-4">
              <h3 className="font-semibold">Secondary Color</h3>
              <ColorSlider label="Hue" color="secondary" property="h" min={0} max={360} value={customScheme.secondary.h} />
              <ColorSlider label="Saturation" color="secondary" property="s" min={0} max={100} value={customScheme.secondary.s} />
              <ColorSlider label="Lightness" color="secondary" property="l" min={0} max={100} value={customScheme.secondary.l} />
            </div>

            {/* Accent Color */}
            <div className="space-y-4">
              <h3 className="font-semibold">Accent Color</h3>
              <ColorSlider label="Hue" color="accent" property="h" min={0} max={360} value={customScheme.accent.h} />
              <ColorSlider label="Saturation" color="accent" property="s" min={0} max={100} value={customScheme.accent.s} />
              <ColorSlider label="Lightness" color="accent" property="l" min={0} max={100} value={customScheme.accent.l} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveScheme} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={resetToDefault} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={exportScheme} variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
              <Button onClick={importScheme} variant="outline" size="icon">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4 mt-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Default Themes</h3>
              <div className="grid gap-2">
                {defaultSchemes.map((scheme, index) => (
                  <Card key={index} className="cursor-pointer hover-scale-glow" onClick={() => loadScheme(scheme)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{scheme.name}</span>
                        <div className="flex gap-1">
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: `hsl(${scheme.primary.h}, ${scheme.primary.s}%, ${scheme.primary.l}%)` }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: `hsl(${scheme.secondary.h}, ${scheme.secondary.s}%, ${scheme.secondary.l}%)` }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: `hsl(${scheme.accent.h}, ${scheme.accent.s}%, ${scheme.accent.l}%)` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {savedSchemes.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Your Saved Themes</h3>
                <div className="grid gap-2">
                  {savedSchemes.map((scheme, index) => (
                    <Card key={index} className="cursor-pointer hover-scale-glow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1" onClick={() => loadScheme(scheme)}>
                            <span className="font-medium">{scheme.name}</span>
                            <div className="flex gap-1">
                              <div 
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: `hsl(${scheme.primary.h}, ${scheme.primary.s}%, ${scheme.primary.l}%)` }}
                              />
                              <div 
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: `hsl(${scheme.secondary.h}, ${scheme.secondary.s}%, ${scheme.secondary.l}%)` }}
                              />
                              <div 
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: `hsl(${scheme.accent.h}, ${scheme.accent.s}%, ${scheme.accent.l}%)` }}
                              />
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteScheme(index);
                            }}
                          >
                            <Palette className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
