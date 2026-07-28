import { renderHook, waitFor, act } from "@testing-library/react";
import { useCustomer } from "@/hooks/useCustomer";
import { crmClient } from "@/lib/api/crm-client";
import type { Customer } from "@/types/customer";

jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    customers: {
      getById: jest.fn(),
    },
  },
}));

const mockCustomer: Customer = {
  id: "abc123",
  userId: "user-1",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Johnson",
  displayName: "Alice Johnson",
  customerType: "Regular",
  status: "Active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-06-01T00:00:00Z",
};

describe("useCustomer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with isLoading true and customer null", () => {
    (crmClient.customers.getById as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCustomer("abc123"));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.customer).toBeNull();
  });

  it("loads customer data on mount", async () => {
    (crmClient.customers.getById as jest.Mock).mockResolvedValue(mockCustomer);
    const { result } = renderHook(() => useCustomer("abc123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.customer).toEqual(mockCustomer);
    expect(result.current.error).toBeNull();
  });

  it("calls getById with the provided id", async () => {
    (crmClient.customers.getById as jest.Mock).mockResolvedValue(mockCustomer);
    renderHook(() => useCustomer("abc123"));

    await waitFor(() =>
      expect(crmClient.customers.getById).toHaveBeenCalledWith("abc123")
    );
  });

  it("sets error state when fetch fails", async () => {
    (crmClient.customers.getById as jest.Mock).mockRejectedValue(
      new Error("Customer not found")
    );
    const { result } = renderHook(() => useCustomer("bad-id"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Customer not found");
    expect(result.current.customer).toBeNull();
  });

  it("does not fetch when id is empty string", () => {
    renderHook(() => useCustomer(""));
    expect(crmClient.customers.getById).not.toHaveBeenCalled();
  });

  it("exposes setCustomer to allow optimistic updates", async () => {
    (crmClient.customers.getById as jest.Mock).mockResolvedValue(mockCustomer);
    const { result } = renderHook(() => useCustomer("abc123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated: Customer = { ...mockCustomer, status: "Inactive" };
    await act(async () => {
      result.current.setCustomer(updated);
    });

    expect(result.current.customer?.status).toBe("Inactive");
  });

  it("polls for customer details every 10 seconds", async () => {
    jest.useFakeTimers();
    (crmClient.customers.getById as jest.Mock).mockResolvedValue(mockCustomer);
    
    renderHook(() => useCustomer("abc123"));
    
    expect(crmClient.customers.getById).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(crmClient.customers.getById).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
