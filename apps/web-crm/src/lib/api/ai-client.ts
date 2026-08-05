import {
  ChurnThresholdConfig,
  PriorityWeightsConfig,
  AnomalySensitivityConfig,
  ConfidenceThresholdsConfig,
} from "@/types/config";

const AI_BASE = process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:4005";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${AI_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `AI API request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.detail) {
        errorMessage = Array.isArray(errorData.detail)
          ? errorData.detail.map((d: any) => d.msg).join(", ")
          : errorData.detail;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const aiClient = {
  config: {
    getChurnThreshold: () =>
      request<ChurnThresholdConfig>("/api/v1/config/churn-threshold"),
    updateChurnThreshold: (body: ChurnThresholdConfig) =>
      request<ChurnThresholdConfig>("/api/v1/config/churn-threshold", {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    getPriorityWeights: () =>
      request<PriorityWeightsConfig>("/api/v1/config/priority-weights"),
    updatePriorityWeights: (body: PriorityWeightsConfig) =>
      request<PriorityWeightsConfig>("/api/v1/config/priority-weights", {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    getAnomalySensitivity: () =>
      request<AnomalySensitivityConfig>("/api/v1/config/anomaly-sensitivity"),
    updateAnomalySensitivity: (body: AnomalySensitivityConfig) =>
      request<AnomalySensitivityConfig>("/api/v1/config/anomaly-sensitivity", {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    getConfidenceThresholds: () =>
      request<ConfidenceThresholdsConfig>("/api/v1/config/confidence-thresholds"),
    updateConfidenceThresholds: (body: ConfidenceThresholdsConfig) =>
      request<ConfidenceThresholdsConfig>("/api/v1/config/confidence-thresholds", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },
  customers: {
    getNextAction: (customerId: string) =>
      request<any>(`/api/v1/customers/${customerId}/next-action`),
    submitFeedback: (customerId: string, feedback: string) =>
      request<any>(`/api/v1/customers/${customerId}/next-action/feedback`, {
        method: "POST",
        body: JSON.stringify({ feedback }),
      }),
  },
  dashboard: {
    getSummary: (from?: string, to?: string) => {
      let url = "/api/v1/dashboard/summary";
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const query = params.toString();
      if (query) url += `?${query}`;
      return request<any>(url);
    },
    getAnomalies: (from?: string, to?: string, status?: string) => {
      let url = "/api/v1/anomalies";
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (status) params.append("status", status);
      const query = params.toString();
      if (query) url += `?${query}`;
      return request<any>(url);
    },
    acknowledgeAnomaly: (id: string) =>
      request<any>(`/api/v1/anomalies/${id}/acknowledge`, {
        method: "POST",
      }),
    getAtRiskCustomers: (limit?: number) => {
      let url = "/api/v1/dashboard/at-risk-customers";
      if (limit) url += `?limit=${limit}`;
      return request<any>(url);
    },
    query: (queryText: string) =>
      request<any>("/api/v1/query", {
        method: "POST",
        body: JSON.stringify({ query: queryText }),
      }),
    ask: (queryText: string, agentId?: string, context?: string) =>
      request<{ type: "text" | "chart" | "table" | "value"; content: any }>("/api/v1/dashboard/ask", {
        method: "POST",
        body: JSON.stringify({ query: queryText, agent_id: agentId, context }),
      }),
    getAutocomplete: (prefix: string, context?: string) =>
      request<{ suffix: string }>("/api/v1/dashboard/autocomplete", {
        method: "POST",
        body: JSON.stringify({ prefix, context }),
      }),
  },
  forecasts: {
    getTicketVolume: (days?: number) => {
      const range = days ? `${days}d` : "7d";
      return request<any>(`/api/v1/forecasts/ticket-volume?range=${range}`);
    },
    getRevenueBySegment: (days?: number) => {
      const range = days && days > 30 ? "90d" : "30d";
      return request<any>(`/api/v1/forecasts/revenue?range=${range}`);
    },
    getChurnDistribution: () =>
      request<any>("/api/v1/forecasts/churn-distribution"),
    getSentimentTrend: (days?: number) => {
      const range = days && days <= 7 ? "7d" : "30d";
      return request<any>(`/api/v1/forecasts/sentiment-trend?range=${range}`);
    },
  },
  tickets: {
    generateSmartReply: (ticketId: string, messages: string[]) =>
      request<{ smart_reply: string }>(`/api/v1/tickets/${ticketId}/smart-reply`, {
        method: "POST",
        body: JSON.stringify({ ticket_id: ticketId, messages }),
      }),
  },
};
