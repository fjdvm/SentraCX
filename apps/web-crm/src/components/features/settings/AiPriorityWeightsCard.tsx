import React from "react";
import { Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PriorityWeightsConfig } from "@/types/config";

interface AiPriorityWeightsCardProps {
  priorityWeights: PriorityWeightsConfig;
  setPriorityWeights: React.Dispatch<React.SetStateAction<PriorityWeightsConfig>>;
  disabled: boolean;
}

export function AiPriorityWeightsCard({
  priorityWeights,
  setPriorityWeights,
  disabled,
}: AiPriorityWeightsCardProps) {
  const combinedSum =
    Number(priorityWeights.sentiment_weight) +
    Number(priorityWeights.urgency_weight) +
    Number(priorityWeights.history_weight);

  const isSumValid = Math.abs(combinedSum - 1.0) < 0.001;

  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardHeader className="p-md sm:p-lg">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-sm">
          <Cpu className="w-4 h-4 text-primary" />
          Priority Weights (Sum must equal 1.0)
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Adjust importance factors utilized in computing urgency ranking scores for incoming support tickets.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-md sm:p-lg pt-0 space-y-4">
        <div className="grid grid-cols-3 gap-sm">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">Sentiment Weight</label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={priorityWeights.sentiment_weight}
              onChange={(e) =>
                setPriorityWeights((prev) => ({
                  ...prev,
                  sentiment_weight: parseFloat(e.target.value) || 0,
                }))
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">Urgency Weight</label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={priorityWeights.urgency_weight}
              onChange={(e) =>
                setPriorityWeights((prev) => ({
                  ...prev,
                  urgency_weight: parseFloat(e.target.value) || 0,
                }))
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">History Weight</label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={priorityWeights.history_weight}
              onChange={(e) =>
                setPriorityWeights((prev) => ({
                  ...prev,
                  history_weight: parseFloat(e.target.value) || 0,
                }))
              }
              disabled={disabled}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold p-sm bg-muted/50 rounded-md border border-border/50">
          <span>Current Combined Sum:</span>
          <span className={isSumValid ? "text-success" : "text-destructive"}>
            {combinedSum.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
