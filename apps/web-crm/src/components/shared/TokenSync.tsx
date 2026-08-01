"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { setClientAccessToken } from "@/lib/api/crm-client";

export function TokenSync() {
  const { data: session } = useSession();

  useEffect(() => {
    setClientAccessToken(session?.accessToken);
  }, [session?.accessToken]);

  return null;
}
