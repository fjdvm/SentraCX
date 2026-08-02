import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketDetailSheet } from "@/components/features/tickets/TicketDetailSheet";
import { useTicket } from "@/hooks/useTicket";
import { crmClient } from "@/lib/api/crm-client";

jest.mock("@/hooks/useTicket");
jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    tickets: {
      claim: jest.fn(),
      unclaim: jest.fn(),
      updateStatus: jest.fn(),
    },
  },
}));

const mockUseTicket = useTicket as jest.MockedFunction<typeof useTicket>;

describe("TicketDetailSheet", () => {
  const onClose = jest.fn();
  const onRefresh = jest.fn();
  const onShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state when fetching ticket", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <TicketDetailSheet
        ticketId="t-1"
        onClose={onClose}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    );

    expect(screen.getByText("Loading ticket details...")).toBeInTheDocument();
  });

  it("handles successful ticket claim and triggers success toast", async () => {
    mockUseTicket.mockReturnValue({
      data: {
        id: "t-1",
        title: "Refund Request",
        description: "Customer wants refund",
        status: "Unclaimed",
        category: "Billing",
        sentiment: "neutral",
        customerName: "Jane Doe",
        createdAt: "2026-08-01T10:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (crmClient.tickets.claim as jest.Mock).mockResolvedValue(undefined);

    render(
      <TicketDetailSheet
        ticketId="t-1"
        onClose={onClose}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    );

    expect(screen.getByText("Refund Request")).toBeInTheDocument();
    const claimButton = screen.getByRole("button", { name: "Claim Ticket" });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(crmClient.tickets.claim).toHaveBeenCalledWith("t-1");
      expect(onShowToast).toHaveBeenCalledWith("Ticket claimed successfully.");
      expect(onRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("handles failed ticket claim and triggers error toast", async () => {
    mockUseTicket.mockReturnValue({
      data: {
        id: "t-1",
        title: "Refund Request",
        description: "Customer wants refund",
        status: "Unclaimed",
        category: "Billing",
        sentiment: "neutral",
        customerName: "Jane Doe",
        createdAt: "2026-08-01T10:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (crmClient.tickets.claim as jest.Mock).mockRejectedValue(new Error("API Error"));

    render(
      <TicketDetailSheet
        ticketId="t-1"
        onClose={onClose}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    );

    const claimButton = screen.getByRole("button", { name: "Claim Ticket" });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(crmClient.tickets.claim).toHaveBeenCalledWith("t-1");
      expect(onShowToast).toHaveBeenCalledWith("Failed to claim ticket.");
      expect(onRefresh).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("handles ticket unclaim and triggers appropriate toast", async () => {
    mockUseTicket.mockReturnValue({
      data: {
        id: "t-1",
        title: "Refund Request",
        description: "Customer wants refund",
        status: "Claimed",
        category: "Billing",
        sentiment: "neutral",
        customerName: "Jane Doe",
        createdAt: "2026-08-01T10:00:00Z",
        assignedToId: "agent-1",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (crmClient.tickets.unclaim as jest.Mock).mockResolvedValue(undefined);

    render(
      <TicketDetailSheet
        ticketId="t-1"
        onClose={onClose}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    );

    const unclaimButton = screen.getByRole("button", { name: "Unclaim" });
    fireEvent.click(unclaimButton);

    await waitFor(() => {
      expect(crmClient.tickets.unclaim).toHaveBeenCalledWith("t-1");
      expect(onShowToast).toHaveBeenCalledWith("Ticket status set to Unclaimed.");
      expect(onRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
