import React from "react";
import { Control } from "react-hook-form";
import type { SettingsFormValues } from "./SettingsPage";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface GeneralSettingsCardProps {
  control: Control<SettingsFormValues>;
}

export function GeneralSettingsCard({ control }: GeneralSettingsCardProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardHeader className="p-md sm:p-lg">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-sm">
          <Shield className="w-5 h-5 text-primary" />
          General System Parameters
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Core configurations for the SentraCX tenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-md sm:p-lg pt-0 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <FormField
            control={control}
            name="systemName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portal Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="slaHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SLA Response Limit (Hours)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
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
