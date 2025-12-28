import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Check, UserPlus } from "lucide-react";

interface GuestLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuestLimitModal = ({ open, onOpenChange }: GuestLimitModalProps) => {
  const benefits = [
    "Unlimited AI chat messages",
    "Access to all AI models",
    "Save your chat history",
    "Custom instructions & presets",
    "Image generation",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">You've used your free messages!</DialogTitle>
          <DialogDescription className="text-base">
            Create a free account to continue chatting and unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            What you get with a free account:
          </p>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Maybe later
          </Button>
          <Link to="/auth" className="w-full sm:w-auto">
            <Button className="gap-2 w-full">
              <UserPlus className="w-4 h-4" />
              Sign Up Free
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
