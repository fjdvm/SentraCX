import React from "react";
import { Control } from "react-hook-form";
import type { SettingsFormValues } from "./SettingsPage";
import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface NotificationSettingsCardProps {
  control: Control<SettingsFormValues>;
}

export function NotificationSettingsCard({ control }: NotificationSettingsCardProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardHeader className="p-md sm:p-lg">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-sm">
          <Bell className="w-5 h-5 text-primary" />
          Notification Subscriptions
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Toggle dispatch settings for staff alerts and client events.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-md sm:p-lg pt-0 space-y-6">
        <FormField
          control={control}
          name="emailAlerts"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between py-sm space-y-0">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-bold text-foreground cursor-pointer">
                  Priority Email Alerts
                </FormLabel>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Dispatched when churn risk predictions cross 60% limit.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="weeklyReports"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between py-sm border-t border-border pt-md space-y-0">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-bold text-foreground cursor-pointer">
                  Weekly AI Forecasts
                </FormLabel>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Receive weekly updates on customer lifetime predictions.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
