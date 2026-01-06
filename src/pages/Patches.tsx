import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, Tag, ChevronRight, Search, Bell, Image as ImageIcon, Megaphone, Rocket, Bug, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface FeatureUpdate {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  image_url: string | null;
  version: string | null;
  category: string;
  published_at: string | null;
  created_at: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  feature: Rocket,
  improvement: Zap,
  bugfix: Bug,
  announcement: Megaphone,
  default: Sparkles,
};

const categoryColors: Record<string, string> = {
  feature: "from-purple-500 to-pink-500",
  improvement: "from-blue-500 to-cyan-500",
  bugfix: "from-orange-500 to-red-500",
  announcement: "from-green-500 to-emerald-500",
  default: "from-primary to-purple-500",
};

const Patches = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_updates')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUpdates = updates.filter(update => {
    const matchesSearch = update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         update.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || update.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(updates.map(u => u.category))];

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || categoryIcons.default;
  };

  const getCategoryGradient = (category: string) => {
    return categoryColors[category] || categoryColors.default;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge 
              variant="outline" 
              className="mb-6 px-4 py-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
            >
              <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
              What's New
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Feature Updates
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Stay up to date with the latest features, improvements, and fixes we've shipped to make Magverse AI even better for you. 🚀
            </p>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search updates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card/50 border-border/50"
                />
              </div>
              <Button
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/10"
                asChild
              >
                <Link to="/home#newsletter">
                  <Bell className="w-4 h-4 mr-2" />
                  Subscribe
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full"
            >
              All
            </Button>
            {categories.map(category => {
              const Icon = getCategoryIcon(category);
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full capitalize"
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {category}
                </Button>
              );
            })}
          </div>
        </section>
      )}

      {/* Updates Grid */}
      <section className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse bg-card/50">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted/30 rounded-lg mb-4" />
                  <div className="h-6 bg-muted/30 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted/30 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredUpdates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No updates yet</h3>
            <p className="text-muted-foreground">
              Stay tuned! We're working on exciting new features.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUpdates.map((update, index) => {
                const Icon = getCategoryIcon(update.category);
                const gradient = getCategoryGradient(update.category);
                
                return (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                      {/* Image */}
                      {update.image_url ? (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={update.image_url}
                            alt={update.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                          <Badge 
                            className={`absolute top-4 left-4 bg-gradient-to-r ${gradient} text-white border-0 capitalize`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {update.category}
                          </Badge>
                        </div>
                      ) : (
                        <div className={`h-32 bg-gradient-to-r ${gradient} flex items-center justify-center`}>
                          <Icon className="w-12 h-12 text-white/80" />
                        </div>
                      )}
                      
                      <CardContent className="p-6">
                        {/* Meta */}
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {update.published_at && format(new Date(update.published_at), 'MMM d, yyyy')}
                          {update.version && (
                            <>
                              <span>•</span>
                              <Tag className="w-4 h-4" />
                              v{update.version}
                            </>
                          )}
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                          {update.title}
                        </h3>
                        
                        {/* Summary */}
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                          {update.summary || update.content.substring(0, 150)}...
                        </p>
                        
                        {/* Read More */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-400 hover:text-purple-300 p-0 h-auto"
                        >
                          Read more
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="container mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center p-8 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/20"
        >
          <Heart className="w-10 h-10 mx-auto mb-4 text-pink-400" />
          <h3 className="text-2xl font-bold mb-2">Never miss an update</h3>
          <p className="text-muted-foreground mb-6">
            Subscribe to our newsletter and get notified about new features directly in your inbox.
          </p>
          <Button 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            asChild
          >
            <Link to="/home#newsletter">
              <Bell className="w-4 h-4 mr-2" />
              Subscribe to Newsletter
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
};

export default Patches;