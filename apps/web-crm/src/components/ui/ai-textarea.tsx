import * as React from "react"
import { cn } from "@/lib/utils"
import { useAiAutocomplete } from "@/hooks/useAiAutocomplete"
import { Textarea } from "./textarea"

export interface AiTextareaProps
  extends React.ComponentProps<"textarea"> {
  context?: string;
  onTextChange?: (val: string) => void;
}

const AiTextarea = React.forwardRef<HTMLTextAreaElement, AiTextareaProps>(
  ({ className, context, value, onChange, onKeyDown, onTextChange, ...props }, ref) => {
    const { suggestion, onTextChange: triggerAi, acceptSuggestion } = useAiAutocomplete(context);

    // This div overlays exactly behind the textarea. We must match the padding and font exactly.
    // Textarea default classes from textarea.tsx: "min-h-[60px] w-full rounded-md border border-input px-sm py-sm text-base md:text-sm"
    return (
      <div className={cn("relative w-full", className)}>
        {/* Ghost text layer */}
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <div className="w-full h-full p-sm border border-transparent whitespace-pre-wrap break-words text-base md:text-sm font-sans">
            <span className="text-transparent">{value}</span>
            {suggestion && (
              <span className="text-muted-foreground/40">{suggestion}</span>
            )}
          </div>
        </div>
        
        {/* Real textarea layer */}
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e);
            if (onTextChange) onTextChange(e.target.value);
            triggerAi(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab" && suggestion) {
              e.preventDefault();
              const newValue = acceptSuggestion(value as string);
              if (onTextChange) onTextChange(newValue);
              // Trigger a synthetic change event if standard onChange is heavily relied upon
              const syntheticEvent = {
                target: { value: newValue }
              } as React.ChangeEvent<HTMLTextAreaElement>;
              if (onChange) onChange(syntheticEvent);
            }
            if (onKeyDown) onKeyDown(e);
          }}
          className="relative z-10 bg-transparent !min-h-0 resize-none overflow-y-auto"
          {...props}
        />
      </div>
    )
  }
)
AiTextarea.displayName = "AiTextarea"

export { AiTextarea }
