import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KpiCard } from "@/components/features/dashboard/kpi-card";
import { KpiRow } from "@/components/features/dashboard/kpi-row";
import { LiveStatusStrip } from "@/components/features/dashboard/live-status-strip";
import { AttentionFeed } from "@/components/features/dashboard/attention-feed";
import { Ticket } from "lucide-react";
import { aiClient } from "@/lib/api/ai-client";

// Mock useDashboardHub hook
jest.mock("@/hooks/useDashboardHub", () => ({
  useDashboardHub: ({ onMetricsUpdated }: any = {}) => {
    const react = require("react");
    const onMetricsUpdatedRef = react.useRef(onMetricsUpdated);
    onMetricsUpdatedRef.current = onMetricsUpdated;
    react.useEffect(() => {
      onMetricsUpdatedRef.current?.({
        activeTickets: 5,
        pendingEscalations: 2,
        unreadConversations: 10,
        onlineAgents: 1,
      });
    }, []);
    return { isConnected: true };
  },
}));

// Mock aiClient
jest.mock("@/lib/api/ai-client", () => ({
  aiClient: {
    dashboard: {
      getAnomalies: jest.fn(),
      acknowledgeAnomaly: jest.fn(),
    },
  },
}));

describe("Dashboard Components", () => {
  describe("KpiCard", () => {
    it("renders label, value, change and trend correctly", () => {
      render(
        <KpiCard
          label="Test Label"
          value="1,234"
          change="+10%"
          trend="up"
          icon={Ticket}
          isNegativeBad={false}
        />
      );
      expect(screen.getByText("Test Label")).toBeInTheDocument();
      expect(screen.getByText("1,234")).toBeInTheDocument();
      expect(screen.getByText("+10%")).toBeInTheDocument();
    });
  });

  describe("KpiRow", () => {
    const mockData = {
      active_tickets: { value: 15, delta: 3, trend: "up" as const },
      average_resolution_hours: { value: 4.5, delta: -0.5, trend: "down" as const },
      churn_rate: { value: 2.4, delta: 0.2, trend: "up" as const },
      average_clv: { value: 4250, delta: 250, trend: "up" as const },
      customer_satisfaction: { value: 4.5, delta: 0.1, trend: "up" as const },
      active_campaigns: { value: 3, delta: 0, trend: "flat" as const },
    };

    it("renders all 6 KPI cards with correct formatted values and labels", () => {
      render(<KpiRow data={mockData} isLoading={false} />);
      expect(screen.getByText("Open Support Requests")).toBeInTheDocument();
      expect(screen.getByText("Avg Time to Resolve")).toBeInTheDocument();
      expect(screen.getByText("Customers Leaving (%)")).toBeInTheDocument();
      expect(screen.getByText("Avg Customer Value")).toBeInTheDocument();
      expect(screen.getByText("Customer Mood")).toBeInTheDocument();
      expect(screen.getByText("Running Promotions")).toBeInTheDocument();

      // Formatted values
      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("4h 30m")).toBeInTheDocument();
      expect(screen.getByText("2.4%")).toBeInTheDocument();
      expect(screen.getByText("$4.3k")).toBeInTheDocument();
      expect(screen.getByText("Positive 😊")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders skeleton loader when loading", () => {
      const { container } = render(<KpiRow data={null} isLoading={true} />);
      expect(container.getElementsByClassName("animate-pulse").length).toBe(6);
    });
  });

  describe("LiveStatusStrip", () => {
    it("renders waiting, urgent, and new messages from metrics", () => {
      render(<LiveStatusStrip />);
      expect(screen.getByText("Waiting to Be Answered:")).toBeInTheDocument();
      expect(screen.getByText("Urgent Issues:")).toBeInTheDocument();
      expect(screen.getByText("New Messages:")).toBeInTheDocument();

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("Live System Status: Optimal")).toBeInTheDocument();
    });
  });

  describe("AttentionFeed", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("renders empty state when there are no anomalies", async () => {
      (aiClient.dashboard.getAnomalies as jest.Mock).mockResolvedValue({ anomalies: [] });
      render(<AttentionFeed />);
      await waitFor(() => {
        expect(screen.getByText("All Clear")).toBeInTheDocument();
      });
    });

    it("renders anomalies and handles acknowledge trigger", async () => {
      const mockAnomalies = [
        {
          id: "anom-1",
          description: "Unusual ticket volume spike detected",
          severity: "critical",
          status: "open",
          detected_at: new Date().toISOString(),
        },
      ];
      (aiClient.dashboard.getAnomalies as jest.Mock).mockResolvedValue({ anomalies: mockAnomalies });
      (aiClient.dashboard.acknowledgeAnomaly as jest.Mock).mockResolvedValue({ success: true });

      render(<AttentionFeed />);
      
      await waitFor(() => {
        expect(screen.getByText("Unusual ticket volume spike detected")).toBeInTheDocument();
      });

      const ackBtn = screen.getByText("Acknowledge");
      fireEvent.click(ackBtn);

      await waitFor(() => {
        expect(aiClient.dashboard.acknowledgeAnomaly).toHaveBeenCalledWith("anom-1");
      });
    });
  });
});
