import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationList } from "@/components/features/conversations/ConversationList";
import { TicketListItem } from "@/types/ticket";

describe("ConversationList", () => {
  const mockTickets: TicketListItem[] = [
    {
      id: "t1",
      title: "Broken screen",
      status: "Ongoing",
      customerName: "Alice Smith",
      createdAt: "2026-08-01T10:00:00Z",
      lastMessageAt: "2026-08-01T10:30:00Z",
      lastMessageContent: "Can you help me replace it?",
      unreadMessageCount: 2,
    },
    {
      id: "t2",
      title: "Delivery delay",
      status: "Claimed",
      customerName: "Bob Jones",
      createdAt: "2026-08-01T09:00:00Z",
      lastMessageAt: "2026-08-01T09:15:00Z",
      lastMessageContent: "Where is my package?",
      unreadMessageCount: 0,
    },
  ];

  it("renders list of conversations with customer name, message preview, and unread badge", () => {
    const handleSelect = jest.fn();
    const handleTabChange = jest.fn();

    render(
      <ConversationList
        tickets={mockTickets}
        activeTicketId="t1"
        onSelect={handleSelect}
        isLoading={false}
        error={null}
        activeTab="all"
        onTabChange={handleTabChange}
      />
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Can you help me replace it?")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Where is my package?")).toBeInTheDocument();
    expect(screen.getByText("1 Unread")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Unread count badge
  });

  it("calls onSelect when clicking a conversation item", () => {
    const handleSelect = jest.fn();
    const handleTabChange = jest.fn();

    render(
      <ConversationList
        tickets={mockTickets}
        activeTicketId="t1"
        onSelect={handleSelect}
        isLoading={false}
        error={null}
        activeTab="all"
        onTabChange={handleTabChange}
      />
    );

    fireEvent.click(screen.getByText("Bob Jones"));
    expect(handleSelect).toHaveBeenCalledWith("t2");
  });

  it("calls onTabChange when selecting a tab filter", () => {
    const handleSelect = jest.fn();
    const handleTabChange = jest.fn();

    render(
      <ConversationList
        tickets={mockTickets}
        activeTicketId="t1"
        onSelect={handleSelect}
        isLoading={false}
        error={null}
        activeTab="all"
        onTabChange={handleTabChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "unread" }));
    expect(handleTabChange).toHaveBeenCalledWith("unread");
  });

  it("renders empty state when no tickets are available", () => {
    render(
      <ConversationList
        tickets={[]}
        activeTicketId={null}
        onSelect={jest.fn()}
        isLoading={false}
        error={null}
        activeTab="all"
        onTabChange={jest.fn()}
      />
    );

    expect(screen.getByText("No conversations found.")).toBeInTheDocument();
  });
});
