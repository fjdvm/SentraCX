import { renderHook, waitFor, act } from "@testing-library/react";
import { useCustomers } from "@/hooks/useCustomers";
import { crmClient } from "@/lib/api/crm-client";
import type { CustomerListItem } from "@/types/customer";

jest.mock("@/lib/api/crm-client", () => ({
  crmClient: {
    customers: {
      list: jest.fn(),
    },
  },
}));

const mockCustomers: CustomerListItem[] = [
  {
    id: "1",
    displayName: "Alice Johnson",
    email: "alice@example.com",
    customerType: "Regular",
    status: "Active",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    displayName: "Bob Corp",
    email: "bob@corp.com",
    customerType: "InstitutionalBuyer",
    status: "Inactive",
    createdAt: "2025-02-01T00:00:00Z",
  },
];

const mockResponse = {
  items: mockCustomers,
  totalCount: 2,
  totalPages: 1,
  page: 1,
  pageSize: 20,
};

describe("useCustomers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with isLoading true", () => {
    (crmClient.customers.list as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCustomers());
    expect(result.current.isLoading).toBe(true);
  });

  it("loads customers on mount", async () => {
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useCustomers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.customers).toEqual(mockCustomers);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("sets error state on fetch failure", async () => {
    (crmClient.customers.list as jest.Mock).mockRejectedValue(new Error("API error"));
    const { result } = renderHook(() => useCustomers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("API error");
    expect(result.current.customers).toEqual([]);
  });

  it("calls crmClient.customers.list with correct search parameter", async () => {
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockResponse);
    renderHook(() => useCustomers({ search: "alice" }));

    await waitFor(() =>
      expect(crmClient.customers.list).toHaveBeenCalledWith(1, 20, undefined, "alice")
    );
  });

  it("returns backend data as is when loaded", async () => {
    const mockFilteredResponse = {
      items: [mockCustomers[0]],
      totalCount: 1,
      totalPages: 1,
      page: 1,
      pageSize: 20,
    };
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockFilteredResponse);
    const { result } = renderHook(() => useCustomers({ search: "alice" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.customers).toEqual([mockCustomers[0]]);
  });

  it("calls crmClient.customers.list with correct page and pageSize", async () => {
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockResponse);
    renderHook(() => useCustomers({ page: 3, pageSize: 10 }));

    await waitFor(() =>
      expect(crmClient.customers.list).toHaveBeenCalledWith(3, 10, undefined, "")
    );
  });

  it("calls crmClient.customers.list with correct customerType filter", async () => {
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockResponse);
    renderHook(() => useCustomers({ page: 1, pageSize: 20, customerType: "Contact" }));

    await waitFor(() =>
      expect(crmClient.customers.list).toHaveBeenCalledWith(1, 20, "Contact", "")
    );
  });

  it("exposes a refetch function that re-fetches customers", async () => {
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useCustomers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    (crmClient.customers.list as jest.Mock).mockResolvedValue({
      ...mockResponse,
      totalCount: 5,
    });
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.totalCount).toBe(5));
  });

  it("polls for customer updates every 10 seconds", async () => {
    jest.useFakeTimers();
    (crmClient.customers.list as jest.Mock).mockResolvedValue(mockResponse);
    
    renderHook(() => useCustomers());
    
    expect(crmClient.customers.list).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(crmClient.customers.list).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
