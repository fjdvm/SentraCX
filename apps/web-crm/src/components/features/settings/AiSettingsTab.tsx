import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiClient } from "@/lib/api/ai-client";
import { PriorityWeightsConfig, ConfidenceThresholdsConfig } from "@/types/config";
import { AiAccessRestricted } from "./AiAccessRestricted";
import { AiRiskThresholdsCard } from "./AiRiskThresholdsCard";
import { AiPriorityWeightsCard } from "./AiPriorityWeightsCard";
import { AiConfidenceThresholdsCard } from "./AiConfidenceThresholdsCard";

interface AiSettingsTabProps {
  hasAiAccess: boolean;
  userRole: string;
  showToast: (msg: string) => void;
}

export function AiSettingsTab({ hasAiAccess, userRole, showToast }: AiSettingsTabProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [churnThreshold, setChurnThreshold] = useState<number>(0.60);
  const [anomalySensitivity, setAnomalySensitivity] = useState<number>(0.50);
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeightsConfig>({
    sentiment_weight: 0.40,
    urgency_weight: 0.30,
    history_weight: 0.30,
  });
  const [confidenceThresholds, setConfidenceThresholds] = useState<ConfidenceThresholdsConfig>({
    sentiment_threshold: 0.70,
    category_threshold: 0.70,
    nba_threshold: 0.70,
    resolution_estimate_threshold: 0.70,
  });

  const fetchAiConfigs = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const [churn, weights, sensitivity, thresholds] = await Promise.all([
        aiClient.config.getChurnThreshold(),
        aiClient.config.getPriorityWeights(),
        aiClient.config.getAnomalySensitivity(),
        aiClient.config.getConfidenceThresholds(),
      ]);

      setChurnThreshold(churn.churn_threshold);
      setPriorityWeights(weights);
      setAnomalySensitivity(sensitivity.sensitivity);
      setConfidenceThresholds(thresholds);
    } catch (err: any) {
      setAiError(err.message || "Failed to load AI configuration from service.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (hasAiAccess) {
      fetchAiConfigs();
    }
  }, [hasAiAccess]);

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiLoading(true);
    setAiError(null);
    try {
      const sum =
        Number(priorityWeights.sentiment_weight) +
        Number(priorityWeights.urgency_weight) +
        Number(priorityWeights.history_weight);

      if (Math.abs(sum - 1.0) > 0.001) {
        throw new Error("Priority weights must sum to exactly 1.0 (e.g. 0.4 + 0.3 + 0.3).");
      }

      await Promise.all([
        aiClient.config.updateChurnThreshold({ churn_threshold: Number(churnThreshold) }),
        aiClient.config.updatePriorityWeights({
          sentiment_weight: Number(priorityWeights.sentiment_weight),
          urgency_weight: Number(priorityWeights.urgency_weight),
          history_weight: Number(priorityWeights.history_weight),
        }),
        aiClient.config.updateAnomalySensitivity({ sensitivity: Number(anomalySensitivity) }),
        aiClient.config.updateConfidenceThresholds({
          sentiment_threshold: Number(confidenceThresholds.sentiment_threshold),
          category_threshold: Number(confidenceThresholds.category_threshold),
          nba_threshold: Number(confidenceThresholds.nba_threshold),
          resolution_estimate_threshold: Number(confidenceThresholds.resolution_estimate_threshold),
        }),
      ]);

      showToast("AI Configurations updated successfully!");
    } catch (err: any) {
      setAiError(err.message || "Failed to save AI configuration.");
    } finally {
      setAiLoading(false);
    }
  };

  if (!hasAiAccess) {
    return <AiAccessRestricted userRole={userRole} />;
  }

  const combinedWeightsSum =
    Number(priorityWeights.sentiment_weight) +
    Number(priorityWeights.urgency_weight) +
    Number(priorityWeights.history_weight);

  const isWeightsSumInvalid = Math.abs(combinedWeightsSum - 1.0) > 0.001;

  return (
    <div className="space-y-6">
      {aiError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-md flex items-start gap-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Configuration Error</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{aiError}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-sm shrink-0 hover:bg-destructive/20 text-destructive"
            onClick={fetchAiConfigs}
          >
            <RefreshCw className="w-3 h-3 mr-xs" /> Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <AiRiskThresholdsCard
          churnThreshold={churnThreshold}
          setChurnThreshold={setChurnThreshold}
          anomalySensitivity={anomalySensitivity}
          setAnomalySensitivity={setAnomalySensitivity}
          disabled={aiLoading}
        />

        <AiPriorityWeightsCard
          priorityWeights={priorityWeights}
          setPriorityWeights={setPriorityWeights}
          disabled={aiLoading}
        />
      </div>

      <AiConfidenceThresholdsCard
        confidenceThresholds={confidenceThresholds}
        setConfidenceThresholds={setConfidenceThresholds}
        disabled={aiLoading}
      />

      <div className="flex justify-end gap-sm">
        <Button type="button" variant="outline" disabled={aiLoading} onClick={fetchAiConfigs}>
          Reset Fields
        </Button>
        <Button
          type="button"
          onClick={handleSaveAiConfig}
          disabled={aiLoading || isWeightsSumInvalid}
        >
          {aiLoading ? "Saving Settings..." : "Save AI Configurations"}
        </Button>
      </div>
    </div>
  );
}
