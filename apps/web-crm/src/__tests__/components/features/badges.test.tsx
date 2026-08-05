import React from "react";
import { render, screen } from "@testing-library/react";
import { CampaignChannelBadge } from "@/components/features/campaigns/CampaignChannelBadge";
import { CampaignStatusBadge } from "@/components/features/campaigns/CampaignStatusBadge";
import { TicketStatusBadge } from "@/components/features/tickets/TicketStatusBadge";

describe("Pastel Badge Components", () => {
  it("renders CampaignChannelBadge correctly for all channels", () => {
    const { rerender } = render(<CampaignChannelBadge channel="Email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();

    rerender(<CampaignChannelBadge channel="InApp" />);
    expect(screen.getByText("InApp")).toBeInTheDocument();
  });

  it("renders CampaignStatusBadge correctly", () => {
    const { rerender } = render(<CampaignStatusBadge status="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();

    rerender(<CampaignStatusBadge status="Draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();

    rerender(<CampaignStatusBadge status="Ended" />);
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  it("renders TicketStatusBadge correctly", () => {
    const { rerender } = render(<TicketStatusBadge status="Unclaimed" />);
    expect(screen.getByText("Unclaimed")).toBeInTheDocument();

    rerender(<TicketStatusBadge status="Claimed" />);
    expect(screen.getByText("Claimed")).toBeInTheDocument();

    rerender(<TicketStatusBadge status="Completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
