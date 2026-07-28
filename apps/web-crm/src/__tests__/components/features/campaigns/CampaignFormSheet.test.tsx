import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CampaignFormSheet } from "@/components/features/campaigns/CampaignFormSheet";

jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    campaigns: {
      create: jest.fn(),
      attachPromotions: jest.fn(),
    },
    upload: {
      uploadFile: jest.fn(),
    },
    customers: {
      list: jest.fn().mockResolvedValue({ items: [], totalCount: 0, totalPages: 1 }),
    },
  },
}));

jest.mock("@/hooks/usePromotions", () => ({
  usePromotions: () => ({ data: [] }),
}));

jest.mock("@/hooks/useTemplates", () => ({
  useTemplates: () => ({ data: [] }),
}));

describe("CampaignFormSheet", () => {
  it("renders trigger button and opens dialog", () => {
    render(<CampaignFormSheet onSuccess={jest.fn()} onShowToast={jest.fn()} />);

    const triggerBtn = screen.getByRole("button", { name: /create campaign/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);

    expect(screen.getByText("Configure target channels, scheduling, and attached promotions.")).toBeInTheDocument();
  });
});
