import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-glass-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Sparkles className="w-8 h-8 text-primary animate-glow-pulse" />
          </div>
          <span className="text-2xl font-bold gradient-text">Magverse AI</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link to="/chat">
            <Button variant="ghost" className="text-foreground">
              Chat
            </Button>
          </Link>
          <Link to="/upgrade">
            <Button variant="glass" className="hidden sm:flex">
              Upgrade to Pro
            </Button>
          </Link>
          <Button variant="outline" className="border-accent/30 text-foreground hover:bg-accent/10">
            Login
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
