"use client";

import React, { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { AskSentraCXPanel } from "@/components/features/dashboard/ask-sentracx-panel";

function MainContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a stable class during SSR/hydration (ml-64, matching defaultOpen=true).
  // After mount, switch to the dynamic value based on sidebar state.
  const marginClass = !mounted || open ? "md:ml-64" : "md:ml-0";

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 pb-16 md:pb-0 transition-[margin] duration-300 ${marginClass}`}
    >
      {/* Top Header Shell */}
      <Header />

      {/* Main Canvas */}
      <main
        key={pathname}
        className="flex-1 w-full bg-background relative overflow-y-auto overflow-x-hidden"
      >
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground relative">
        {/* Sidebar Shell */}
        <Sidebar />

        {/* Content Area Container */}
        <MainContent>{children}</MainContent>

        {/* Mobile Navigation Shell */}
        <MobileNav />
      </div>

      {/* Floating AI Chat — placed outside all layout containers to avoid
          transform/transition containment breaking fixed positioning on md+ screens */}
      <Suspense fallback={null}>
        <AskSentraCXPanel />
      </Suspense>
    </SidebarProvider>
  );
}
