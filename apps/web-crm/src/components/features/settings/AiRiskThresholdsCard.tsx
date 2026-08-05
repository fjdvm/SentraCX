import React from "react";
import { Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AiRiskThresholdsCardProps {
  churnThreshold: number;
  setChurnThreshold: (val: number) => void;
  anomalySensitivity: number;
  setAnomalySensitivity: (val: number) => void;
  disabled: boolean;
}

export function AiRiskThresholdsCard({
  churnThreshold,
  setChurnThreshold,
  anomalySensitivity,
  setAnomalySensitivity,
  disabled,
}: AiRiskThresholdsCardProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardHeader className="p-md sm:p-lg">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-sm">
          <Cpu className="w-4 h-4 text-primary" />
          Risk & Anomaly Thresholds
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Define critical thresholds for risk scores and anomaly detection filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-md sm:p-lg pt-0 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground">
            Churn Alert Threshold (0.00 - 1.00)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={churnThreshold}
            onChange={(e) => setChurnThreshold(parseFloat(e.target.value) || 0)}
            disabled={disabled}
          />
          <p className="text-[11px] text-muted-foreground">
            Trigger support intervention alerts if predicted churn probability crosses this value.
          </p>
        </div>

        <div className="space-y-2 pt-sm border-t border-border/50">
          <label className="text-xs font-bold text-foreground">
            Anomaly Sensitivity (0.00 - 1.00)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={anomalySensitivity}
            onChange={(e) => setAnomalySensitivity(parseFloat(e.target.value) || 0)}
            disabled={disabled}
          />
          <p className="text-[11px] text-muted-foreground">
            Controls the filter threshold for triggering anomaly flags on abnormal ticket volume spikes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
