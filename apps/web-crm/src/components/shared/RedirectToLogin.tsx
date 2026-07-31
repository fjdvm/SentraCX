"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function RedirectToLogin() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  useEffect(() => {
    signIn("authservice", { callbackUrl });
  }, [callbackUrl]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-3 font-sans text-body-md text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Redirecting to sign in...
      </div>
    </div>
  );
}
