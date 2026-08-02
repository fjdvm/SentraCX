import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useConversationTickets,
  sortTicketsByActivity,
} from "@/hooks/useConversationTickets";
import { crmClient } from "@/lib/api/crm-client";
import { TicketListItem } from "@/types/ticket";

jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    tickets: {
      list: jest.fn(),
    },
  },
}));

describe("sortTicketsByActivity", () => {
  it("sorts tickets by most recent lastMessageAt first", () => {
    const t1: TicketListItem = {
      id: "1",
      title: "Older Ticket",
      status: "Claimed",
      customerName: "Alice",
      createdAt: "2026-08-01T10:00:00Z",
      lastMessageAt: "2026-08-01T10:30:00Z",
    };
    const t2: TicketListItem = {
      id: "2",
      title: "Newer Message Ticket",
      status: "Ongoing",
      customerName: "Bob",
      createdAt: "2026-08-01T09:00:00Z",
      lastMessageAt: "2026-08-01T11:00:00Z",
    };

    const sorted = sortTicketsByActivity([t1, t2]);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("falls back to updatedAt and createdAt if lastMessageAt is missing", () => {
    const t1: TicketListItem = {
      id: "1",
      title: "Ticket 1",
      status: "Claimed",
      customerName: "Alice",
      createdAt: "2026-08-01T12:00:00Z",
    };
    const t2: TicketListItem = {
      id: "2",
      title: "Ticket 2",
      status: "Ongoing",
      customerName: "Bob",
      createdAt: "2026-08-01T08:00:00Z",
      updatedAt: "2026-08-01T13:00:00Z",
    };

    const sorted = sortTicketsByActivity([t1, t2]);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });
});

describe("useConversationTickets", () => {
  const mockClaimed: TicketListItem[] = [
    {
      id: "ticket-1",
      title: "Billing issue",
      status: "Claimed",
      customerName: "Alice",
      createdAt: "2026-08-01T10:00:00Z",
      lastMessageAt: "2026-08-01T10:05:00Z",
      lastMessageContent: "Initial message",
      unreadMessageCount: 0,
    },
  ];

  const mockOngoing: TicketListItem[] = [
    {
      id: "ticket-2",
      title: "Technical inquiry",
      status: "Ongoing",
      customerName: "Bob",
      createdAt: "2026-08-01T09:00:00Z",
      lastMessageAt: "2026-08-01T10:20:00Z",
      lastMessageContent: "Any updates?",
      unreadMessageCount: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (crmClient.tickets.list as jest.Mock).mockImplementation((page, pageSize, status) => {
      if (status === "Claimed") {
        return Promise.resolve({
          items: mockClaimed,
          page: 1,
          pageSize: 100,
          totalCount: 1,
          totalPages: 1,
        });
      }
      return Promise.resolve({
        items: mockOngoing,
        page: 1,
        pageSize: 100,
        totalCount: 1,
        totalPages: 1,
      });
    });
  });

  it("fetches and merges claimed and ongoing tickets sorted by recent activity", async () => {
    const { result } = renderHook(() => useConversationTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tickets).toHaveLength(2);
    // ticket-2 has lastMessageAt 10:20, ticket-1 has 10:05 -> ticket-2 should be first
    expect(result.current.tickets[0].id).toBe("ticket-2");
    expect(result.current.tickets[1].id).toBe("ticket-1");
  });

  it("moves ticket to top when onMessageActivity is triggered", async () => {
    const { result } = renderHook(() => useConversationTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ticket-1 receives a new message
    act(() => {
      result.current.onMessageActivity(
        "ticket-1",
        {
          content: "I have another question",
          sentAt: "2026-08-01T10:30:00Z",
          isRead: false,
        },
        false
      );
    });

    expect(result.current.tickets[0].id).toBe("ticket-1");
    expect(result.current.tickets[0].lastMessageContent).toBe("I have another question");
    expect(result.current.tickets[0].unreadMessageCount).toBe(1);
  });

  it("marks ticket as read", async () => {
    const { result } = renderHook(() => useConversationTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tickets[0].unreadMessageCount).toBe(1);

    act(() => {
      result.current.markTicketAsRead("ticket-2");
    });

    expect(result.current.tickets[0].unreadMessageCount).toBe(0);
  });

  it("removes a ticket and updates active ticket", async () => {
    const { result } = renderHook(() => useConversationTickets("ticket-2"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeTicketId).toBe("ticket-2");

    act(() => {
      result.current.removeTicket("ticket-2");
    });

    expect(result.current.tickets).toHaveLength(1);
    expect(result.current.tickets[0].id).toBe("ticket-1");
    expect(result.current.activeTicketId).toBe("ticket-1");
  });
});
