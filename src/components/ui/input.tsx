import * as React from "react";
import { useCursor } from "@/contexts/CursorContext";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Try to use cursor context if available, but don't fail if it's not
    let setCursorVariant: ((variant: string) => void) | undefined;
    
    try {
      const cursor = useCursor();
      setCursorVariant = cursor.setCursorVariant;
    } catch (e) {
      // CursorProvider not available - that's ok, cursor effects are optional
      setCursorVariant = undefined;
    }
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        onMouseEnter={() => setCursorVariant?.('input')}
        onMouseLeave={() => setCursorVariant?.('default')}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
