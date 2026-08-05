"use client";

import React, { useState, useEffect } from "react";
import { Save, Cpu } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form } from "@/components/ui/form";
import { accounts } from "@/components/shared/SidebarNav";
import { GeneralSettingsCard } from "./GeneralSettingsCard";
import { NotificationSettingsCard } from "./NotificationSettingsCard";
import { IntegrationSettingsCard } from "./IntegrationSettingsCard";
import { AiSettingsTab } from "./AiSettingsTab";

export interface SettingsFormValues {
  systemName: string;
  slaHours: number;
  emailAlerts: boolean;
  weeklyReports: boolean;
  crmUrl: string;
  analyticsUrl: string;
}

export function SettingsPage() {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Role simulation states
  const [userRole, setUserRole] = useState("Administrator");
  const [hasAiAccess, setHasAiAccess] = useState(true);

  const form = useForm<SettingsFormValues>({
    defaultValues: {
      systemName: "SentraCX Portal",
      slaHours: 24,
      emailAlerts: true,
      weeklyReports: false,
      crmUrl: "https://localhost:5001",
      analyticsUrl: "https://localhost:4005",
    },
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const onSubmit = (_values: SettingsFormValues) => {
    showToast("Configuration settings updated successfully!");
  };

  useEffect(() => {
    const checkRole = () => {
      const activeId = localStorage.getItem("activeAccount") || "admin";
      const matched = accounts.find((a) => a.id === activeId);
      const role = matched ? matched.role : "Administrator";
      setUserRole(role);
      setHasAiAccess(role === "Administrator" || role === "Support Manager");
    };

    checkRole();
    window.addEventListener("storage", checkRole);
    return () => window.removeEventListener("storage", checkRole);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto py-lg px-md md:px-lg space-y-8 flex flex-col justify-center min-h-[calc(100vh-6rem)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-20 right-6 md:right-10 bg-primary text-primary-foreground px-md py-sm rounded-lg text-sm font-medium z-[100] shadow-md border border-border animate-in fade-in slide-in-from-bottom-5 duration-300">
          {toastMsg}
        </div>
      )}

      {/* Header Banner */}
      <div className="space-y-1 text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure general preferences, alert triggers, and backend microservice bindings.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md border-b border-border pb-sm">
              <TabsList className="bg-muted w-full sm:w-auto flex justify-start overflow-x-auto">
                <TabsTrigger value="general" className="font-semibold text-sm cursor-pointer">General</TabsTrigger>
                <TabsTrigger value="notifications" className="font-semibold text-sm cursor-pointer">Notifications</TabsTrigger>
                <TabsTrigger value="integration" className="font-semibold text-sm cursor-pointer">Integrations</TabsTrigger>
                <TabsTrigger value="ai-config" className="font-semibold text-sm cursor-pointer flex items-center gap-xs.5">
                  <Cpu className="w-3.5 h-3.5" />
                  AI Thresholds
                </TabsTrigger>
              </TabsList>
              
              {activeTab !== "ai-config" && (
                <Button 
                  type="submit"
                  className="w-full sm:w-auto self-start sm:self-center"
                >
                  <Save className="w-4 h-4 mr-sm" />
                  Save Changes
                </Button>
              )}
            </div>

            {/* General Content */}
            <TabsContent value="general">
              <GeneralSettingsCard control={form.control} />
            </TabsContent>

            {/* Notifications Content */}
            <TabsContent value="notifications">
              <NotificationSettingsCard control={form.control} />
            </TabsContent>

            {/* Integration Content */}
            <TabsContent value="integration">
              <IntegrationSettingsCard control={form.control} />
            </TabsContent>

            {/* AI Configuration Content */}
            <TabsContent value="ai-config">
              <AiSettingsTab
                hasAiAccess={hasAiAccess}
                userRole={userRole}
                showToast={showToast}
              />
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
