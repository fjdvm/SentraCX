import { useState, useEffect, useCallback, useRef } from "react";
import { aiClient } from "@/lib/api/ai-client";

export function useAiAutocomplete(context?: string) {
  const [suggestion, setSuggestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestion = useCallback(async (text: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (!text || text.trim().length < 3) {
      setSuggestion("");
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    try {
      const response = await aiClient.dashboard.getAutocomplete(text, context);
      if (!abortController.signal.aborted) {
        setSuggestion(response.suffix);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        setSuggestion("");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [context]);

  const onTextChange = useCallback((text: string) => {
    setSuggestion(""); // clear immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestion(text);
    }, 400); // 400ms debounce
  }, [fetchSuggestion]);

  const acceptSuggestion = useCallback((currentText: string) => {
    if (!suggestion) return currentText;
    const result = currentText + suggestion;
    setSuggestion("");
    return result;
  }, [suggestion]);

  return {
    suggestion,
    isLoading,
    onTextChange,
    acceptSuggestion,
    clearSuggestion: () => setSuggestion("")
  };
}
