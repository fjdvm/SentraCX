import * as React from "react"
import { cn } from "@/lib/utils"
import { useAiAutocomplete } from "@/hooks/useAiAutocomplete"
import { Input } from "./input"

export interface AiInputProps
  extends React.ComponentProps<"input"> {
  context?: string;
  onTextChange?: (val: string) => void;
}

const AiInput = React.forwardRef<HTMLInputElement, AiInputProps>(
  ({ className, context, value, onChange, onKeyDown, onTextChange, ...props }, ref) => {
    const { suggestion, onTextChange: triggerAi, acceptSuggestion } = useAiAutocomplete(context);

    return (
      <div className={cn("relative w-full flex items-center", className)}>
        {/* Ghost text layer */}
        <div 
          className="absolute inset-0 pointer-events-none flex items-center overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <div className="w-full px-sm border border-transparent whitespace-pre text-base md:text-sm font-sans truncate">
            <span className="text-transparent">{value}</span>
            {suggestion && (
              <span className="text-muted-foreground/40">{suggestion}</span>
            )}
          </div>
        </div>
        
        {/* Real input layer */}
        <Input
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
              const syntheticEvent = {
                target: { value: newValue }
              } as React.ChangeEvent<HTMLInputElement>;
              if (onChange) onChange(syntheticEvent);
            }
            if (onKeyDown) onKeyDown(e);
          }}
          className="relative z-10 bg-transparent w-full"
          {...props}
        />
      </div>
    )
  }
)
AiInput.displayName = "AiInput"

export { AiInput }
