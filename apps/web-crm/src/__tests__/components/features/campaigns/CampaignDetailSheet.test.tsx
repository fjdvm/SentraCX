import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CampaignDetailSheet } from "@/components/features/campaigns/CampaignDetailSheet";
import { crmClient } from "@/lib/api/crm-client";

jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    campaigns: {
      getById: jest.fn(),
      updateStatus: jest.fn(),
      send: jest.fn(),
    },
  },
}));

describe("CampaignDetailSheet", () => {
  const mockCampaign = {
    id: "camp-1",
    title: "Summer Deal",
    subject: "Big Savings",
    description: "Save up to 50%",
    channels: ["Email"],
    targetAudience: "All",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (crmClient.campaigns.getById as jest.Mock).mockResolvedValue(mockCampaign);
  });

  it("handles email dispatch with zero recipients", async () => {
    (crmClient.campaigns.send as jest.Mock).mockResolvedValue({
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      errors: [],
      message: "No active recipients matched the campaign audience criteria.",
    });

    const onShowToast = jest.fn();
    const onRefresh = jest.fn();

    render(
      <CampaignDetailSheet
        campaignId="camp-1"
        onClose={jest.fn()}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Summer Deal")).toBeInTheDocument();
    });

    const sendBtn = screen.getByRole("button", { name: /send email now/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(crmClient.campaigns.send).toHaveBeenCalledWith("camp-1");
      expect(onShowToast).toHaveBeenCalledWith(
        "No active recipients matched the campaign audience criteria."
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("handles successful email dispatch", async () => {
    (crmClient.campaigns.send as jest.Mock).mockResolvedValue({
      totalRecipients: 5,
      sentCount: 5,
      failedCount: 0,
      errors: [],
      message: "Campaign successfully dispatched to 5 recipient(s).",
    });

    const onShowToast = jest.fn();

    render(
      <CampaignDetailSheet
        campaignId="camp-1"
        onClose={jest.fn()}
        onRefresh={jest.fn()}
        onShowToast={onShowToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Summer Deal")).toBeInTheDocument();
    });

    const sendBtn = screen.getByRole("button", { name: /send email now/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith(
        "Campaign successfully dispatched to 5 recipient(s)."
      );
    });
  });

  it("handles partial failure dispatch", async () => {
    (crmClient.campaigns.send as jest.Mock).mockResolvedValue({
      totalRecipients: 5,
      sentCount: 3,
      failedCount: 2,
      errors: ["SMTP auth failure"],
      message: "Partially dispatched: 3 sent, 2 failed. Errors: SMTP auth failure",
    });

    const onShowToast = jest.fn();

    render(
      <CampaignDetailSheet
        campaignId="camp-1"
        onClose={jest.fn()}
        onRefresh={jest.fn()}
        onShowToast={onShowToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Summer Deal")).toBeInTheDocument();
    });

    const sendBtn = screen.getByRole("button", { name: /send email now/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith(
        "Warning: Partially dispatched: 3 sent, 2 failed. Errors: SMTP auth failure"
      );
    });
  });
});
