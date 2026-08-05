import { renderHook, act } from "@testing-library/react";
import { useSignalR } from "@/hooks/useSignalR";
import * as signalR from "@microsoft/signalr";
import type { Message } from "@/types/message";

const mockHandlers: Record<string, Function> = {};

const mockConnection = {
  state: signalR.HubConnectionState.Connected,
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  invoke: jest.fn().mockResolvedValue(undefined),
  on: jest.fn((event: string, handler: Function) => {
    mockHandlers[event] = handler;
  }),
};

jest.mock("@microsoft/signalr", () => {
  return {
    HubConnectionState: {
      Connected: "Connected",
      Disconnected: "Disconnected",
    },
    HttpTransportType: {
      WebSockets: 1,
    },
    HubConnectionBuilder: jest.fn().mockImplementation(() => ({
      withUrl: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockConnection),
    })),
  };
});

describe("useSignalR", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockHandlers).forEach((key) => delete mockHandlers[key]);
  });

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("builds connection and invokes JoinTicket on mount", async () => {
    const { result } = renderHook(() =>
      useSignalR({
        ticketId: "ticket-101",
      })
    );

    expect(mockConnection.start).toHaveBeenCalled();

    // Wait for promise resolution in connection.start
    await act(async () => {
      await flushPromises();
    });

    expect(mockConnection.invoke).toHaveBeenCalledWith("JoinStaff");
    expect(mockConnection.invoke).toHaveBeenCalledWith("JoinTicket", "ticket-101");
  });

  it("invokes LeaveTicket on unmount", async () => {
    const { unmount } = renderHook(() =>
      useSignalR({
        ticketId: "ticket-101",
      })
    );

    await act(async () => {
      await flushPromises();
    });

    unmount();

    // Cleanup defers leave/stop until the start promise settles
    await act(async () => {
      await flushPromises();
    });

    expect(mockConnection.invoke).toHaveBeenCalledWith("LeaveTicket", "ticket-101");
    expect(mockConnection.invoke).toHaveBeenCalledWith("LeaveStaff");
    expect(mockConnection.stop).toHaveBeenCalled();
  });

  it("invokes LeaveTicket(prev) and JoinTicket(next) when ticketId changes", async () => {
    const { rerender } = renderHook(
      ({ ticketId }) =>
        useSignalR({
          ticketId,
        }),
      {
        initialProps: { ticketId: "ticket-1" },
      }
    );

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      rerender({ ticketId: "ticket-2" });
    });

    expect(mockConnection.invoke).toHaveBeenCalledWith("LeaveTicket", "ticket-1");
    expect(mockConnection.invoke).toHaveBeenCalledWith("JoinTicket", "ticket-2");
  });

  it("triggers onReceiveMessage callback when ReceiveMessage event fires", async () => {
    const onReceiveMessage = jest.fn();
    const { result } = renderHook(() =>
      useSignalR({
        ticketId: "ticket-101",
        onReceiveMessage,
      })
    );

    await act(async () => {
      await flushPromises();
    });

    const testMsg: Message = {
      id: "msg-99",
      senderId: "customer-1",
      senderName: "Customer",
      content: "Realtime test message",
      isRead: false,
      sentAt: "2026-07-22T10:00:00Z",
    };

    act(() => {
      mockHandlers["ReceiveMessage"]?.(testMsg);
    });

    expect(onReceiveMessage).toHaveBeenCalledWith(testMsg);
  });
});
