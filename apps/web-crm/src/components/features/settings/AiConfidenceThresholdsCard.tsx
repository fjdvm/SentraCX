import React from "react";
import { Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfidenceThresholdsConfig } from "@/types/config";

interface AiConfidenceThresholdsCardProps {
  confidenceThresholds: ConfidenceThresholdsConfig;
  setConfidenceThresholds: React.Dispatch<React.SetStateAction<ConfidenceThresholdsConfig>>;
  disabled: boolean;
}

export function AiConfidenceThresholdsCard({
  confidenceThresholds,
  setConfidenceThresholds,
  disabled,
}: AiConfidenceThresholdsCardProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardHeader className="p-md sm:p-lg">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-sm">
          <Cpu className="w-4 h-4 text-primary" />
          Confidence Thresholds (0.00 - 1.00)
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Minimum confidence thresholds before AI-generated outputs are accepted; scores below these will fall back to manual verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-md sm:p-lg pt-0 grid grid-cols-1 sm:grid-cols-2 gap-md">
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Sentiment Analysis Confidence</label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={confidenceThresholds.sentiment_threshold}
            onChange={(e) =>
              setConfidenceThresholds((prev) => ({
                ...prev,
                sentiment_threshold: parseFloat(e.target.value) || 0,
              }))
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Category Classification Confidence</label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={confidenceThresholds.category_threshold}
            onChange={(e) =>
              setConfidenceThresholds((prev) => ({
                ...prev,
                category_threshold: parseFloat(e.target.value) || 0,
              }))
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Next-Best-Action Recommendation Confidence</label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={confidenceThresholds.nba_threshold}
            onChange={(e) =>
              setConfidenceThresholds((prev) => ({
                ...prev,
                nba_threshold: parseFloat(e.target.value) || 0,
              }))
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Resolution Estimate Confidence</label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={confidenceThresholds.resolution_estimate_threshold}
            onChange={(e) =>
              setConfidenceThresholds((prev) => ({
                ...prev,
                resolution_estimate_threshold: parseFloat(e.target.value) || 0,
              }))
            }
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
