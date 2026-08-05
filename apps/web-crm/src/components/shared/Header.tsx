"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HeaderNotifications } from "./HeaderNotifications";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator"


function getBreadcrumbItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [
      { label: "CRM", href: "/" },
      { label: "Dashboard", isCurrent: true },
    ];
  }

  const items: Array<{ label: string; href?: string; isCurrent?: boolean }> = [
    { label: "CRM", href: "/customers" },
  ];

  if (segments[0] === "customers") {
    if (segments.length === 1) {
      items.push({ label: "Customers", isCurrent: true });
    } else {
      items.push({ label: "Customers", href: "/customers" });
      items.push({ label: "Detail", isCurrent: true });
    }
  } else {
    const pageName = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
    items.push({ label: pageName, isCurrent: true });
  }

  return items;
}

export function Header() {
  const rawPathname = usePathname();
  const pathname = rawPathname || "/";
  const breadcrumbItems = getBreadcrumbItems(pathname);

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-md sm:px-lg h-16 bg-background border-b border-border">
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center gap-sm sm:gap-md flex-1 overflow-hidden">
        <SidebarTrigger className="h-9 w-9 shrink-0  hover:bg-accent text-foreground transition-all cursor-pointer" />
        <Separator orientation="vertical" className="h-5" /> 
        <Breadcrumb className="overflow-hidden">
          <BreadcrumbList className="flex-nowrap whitespace-nowrap text-sm sm:text-base font-semibold">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator className="text-muted-foreground [&>svg]:w-4 [&>svg]:h-4" />}
                <BreadcrumbItem>
                  {item.isCurrent ? (
                    <BreadcrumbPage className="font-bold text-foreground">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground font-semibold">
                      <Link href={item.href || "#"}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Notifications & Help */}
      <div className="flex items-center gap-xs shrink-0">
        <HeaderNotifications />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground w-8 h-8">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
