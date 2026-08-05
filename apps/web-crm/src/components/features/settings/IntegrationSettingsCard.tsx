import React from "react";
import { Control } from "react-hook-form";
import type { SettingsFormValues } from "./SettingsPage";
import { Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface IntegrationSettingsCardProps {
  control: Control<SettingsFormValues>;
}

export function IntegrationSettingsCard({ control }: IntegrationSettingsCardProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardHeader className="p-md sm:p-lg">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-sm">
          <Network className="w-5 h-5 text-primary" />
          Backend Endpoints Config
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Configure endpoints for REST API communications.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-md sm:p-lg pt-0 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <FormField
            control={control}
            name="crmUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CRM Core URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="analyticsUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Analytics Microservice URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
