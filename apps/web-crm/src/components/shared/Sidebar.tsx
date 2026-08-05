"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mainNavItems, settingsNavItem, systems } from "./SidebarNav";
import { SidebarProfileFooter } from "./SidebarProfileFooter";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { open, openMobile, setOpenMobile, toggleSidebar, isMobile } =
    useSidebar();
  const [activeAccount, setActiveAccountState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeAccount") || "admin";
    }
    return "admin";
  });
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Initialize in localStorage if not set
    if (localStorage.getItem("activeAccount") === null) {
      localStorage.setItem("activeAccount", "admin");
    }
  }, []);

  const setActiveAccount = (id: string) => {
    setActiveAccountState(id);
    localStorage.setItem("activeAccount", id);
    window.dispatchEvent(new Event("storage"));
  };


  const isOpen = isMobile ? openMobile : open;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // During SSR and initial hydration, render the sidebar so the server and
  // client trees match. After mounting, respect the open/mobile state.
  if (mounted && !isOpen) {
    return null;
  }

  const SettingsIcon = settingsNavItem.icon;
  const isSettingsActive = pathname === settingsNavItem.href;

  const allowedNavItems = mainNavItems.filter((item) => {
    if (!session) return false;
    if (session.isSuperUser) return true;

    let modName = "";
    if (item.href === "/" || item.href === "/dashboard") modName = "Dashboard";
    else if (item.href.startsWith("/customers")) modName = "Customer Profiles";
    else if (item.href.startsWith("/conversations")) modName = "Conversations";
    else if (item.href.startsWith("/tickets")) modName = "Tickets";
    else if (item.href.startsWith("/campaigns")) modName = "Campaigns";

    if (!modName) return true;
    return !!session.permissions?.CRMS?.[modName]?.canRead;
  });

  const showSettings = !!session?.isSuperUser;

  return (
    <>
      {isMobile && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
        />
      )}
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground z-[60] transition-all duration-300 shadow-xl md:shadow-none animate-in slide-in-from-left duration-300">
        <SidebarHeader className="p-md border-b border-border/50">
          <div className="flex items-center justify-between gap-xs">
            <div className="flex-1 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center justify-between p-sm rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors group">
                    <div className="flex flex-col min-w-0 pr-sm">
                      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-sidebar-foreground truncate">
                        Bren Raphael&apos;s
                      </h1>
                      <button className="text-xs font-semibold bg-violet-500 text-white px-sm py-xs rounded truncate mt-0.5 ">
                        Customer Relationship Mgmt.
                      </button>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sidebar-foreground transition-colors" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 bg-popover border-border text-popover-foreground z-[99999]"
                  align="start"
                  side="bottom"
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                    Select Enterprise Module
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  {systems.map((sys) => {
                    const SysIcon = sys.icon;
                    return (
                      <DropdownMenuItem
                        key={sys.fullName}
                        className="cursor-pointer text-xs flex items-center justify-between py-sm.5 px-sm hover:bg-accent font-medium"
                      >
                        <div className="flex items-center gap-sm.5 overflow-hidden">
                          <SysIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span
                              className={`font-semibold truncate ${sys.active ? "text-foreground font-bold" : ""}`}
                            >
                              {sys.fullName}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {sys.desc}
                            </span>
                          </div>
                        </div>
                        {sys.active && (
                          <Check className="w-4 h-4 text-primary shrink-0 ml-sm" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isMobile && (
              <SidebarTrigger
                className="text-muted-foreground hover:text-sidebar-foreground h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                title="Close Sidebar"
              >
                <X className="w-5 h-5" />
              </SidebarTrigger>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="p-md overflow-y-auto">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {allowedNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="w-full flex items-center gap-sm px-sm py-sm rounded-lg text-sm transition-colors"
                      >
                        <Link href={item.href} onClick={handleNavClick}>
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-sm border-t border-border space-y-2">
          {showSettings && (
            <SidebarMenu>
              <SidebarMenuItem key={settingsNavItem.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isSettingsActive}
                  className="w-full flex items-center gap-sm px-sm py-sm rounded-lg text-sm transition-colors"
                >
                  <Link href={settingsNavItem.href} onClick={handleNavClick}>
                    <SettingsIcon className="w-4 h-4 shrink-0" />
                    <span>{settingsNavItem.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

          <div className="pt-sm border-t border-border">
            <SidebarProfileFooter
              activeAccount={activeAccount}
              onSelectAccount={setActiveAccount}
            />
          </div>
        </SidebarFooter>

        <SidebarRail />
      </aside>
    </>
  );
}
