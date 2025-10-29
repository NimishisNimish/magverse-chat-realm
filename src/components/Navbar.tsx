import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();

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
          {user ? (
            <>
              <Link to="/chat">
                <Button variant="ghost" className="text-foreground">
                  Chat
                </Button>
              </Link>
              {!profile?.is_pro && (
                <Link to="/upgrade">
                  <Button variant="glass" className="hidden sm:flex">
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-accent/30">
                    {profile?.email?.substring(0, 20)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <Zap className="w-4 h-4 mr-2" />
                    {profile?.is_pro ? 'Pro (Unlimited)' : `${profile?.credits_remaining || 0} Credits`}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="border-accent/30 text-foreground hover:bg-accent/10">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
