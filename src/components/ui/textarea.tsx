import * as React from "react";
import { useCursor } from "@/contexts/CursorContext";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
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
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onMouseEnter={() => setCursorVariant?.('input')}
      onMouseLeave={() => setCursorVariant?.('default')}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
