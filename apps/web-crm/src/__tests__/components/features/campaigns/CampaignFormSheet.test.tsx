import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CampaignFormSheet } from "@/components/features/campaigns/CampaignFormSheet";

jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    campaigns: {
      create: jest.fn(),
    },
    upload: {
      uploadFile: jest.fn(),
    },
    customers: {
      list: jest.fn().mockResolvedValue({
        items: [
          { id: "c1", displayName: "Alice Smith", email: "alice@example.com" },
          { id: "c2", displayName: "Bob Jones", email: "bob@example.com" },
        ],
        totalCount: 2,
        totalPages: 1,
      }),
    },
  },
}));

jest.mock("@/hooks/useCustomers", () => ({
  useCustomers: () => ({
    customers: [
      { id: "c1", displayName: "Alice Smith", email: "alice@example.com" },
      { id: "c2", displayName: "Bob Jones", email: "bob@example.com" },
    ],
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useTemplates", () => ({
  useTemplates: () => ({ data: [] }),
}));

describe("CampaignFormSheet", () => {
  it("renders trigger button and opens dialog with In-App and Email channels only", () => {
    render(<CampaignFormSheet onSuccess={jest.fn()} onShowToast={jest.fn()} />);

    const triggerBtn = screen.getByRole("button", { name: /create campaign/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);

    expect(screen.getByText("Configure target channels and scheduling strategy.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^email$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^in-app$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^facebook$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^twitter$/i })).not.toBeInTheDocument();
  });

  it("shows contact search bar when Specific audience is selected and filters contacts", async () => {
    render(<CampaignFormSheet onSuccess={jest.fn()} onShowToast={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));

    const audienceSelect = screen.getByLabelText(/target audience/i);
    fireEvent.change(audienceSelect, { target: { value: "Specific" } });

    expect(screen.getByPlaceholderText(/search contacts by name or email/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search contacts by name or email/i);
    fireEvent.change(searchInput, { target: { value: "alice" } });

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
  });
});
