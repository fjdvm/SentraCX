import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { crmClient } from "@/lib/api/crm-client";
import { Template } from "@/types/campaign";

export function useTemplates(channel?: string) {
  const { data: session } = useSession();
  const [data, setData] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await crmClient.templates.list(channel);
      setData(res ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load templates"));
    } finally {
      setIsLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates, session?.accessToken]);

  return { data, isLoading, error, refetch: fetchTemplates };
}
