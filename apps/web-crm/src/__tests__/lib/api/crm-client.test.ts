/**
 * @jest-environment node
 */
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { crmClient } from "@/lib/api/crm-client";

const BASE = "https://localhost:5005";

beforeEach(() => {
  jest.resetAllMocks();
});

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

describe("crmClient.customers.list", () => {
  it("calls the correct URL with default pagination", async () => {
    mockFetch(200, { items: [], totalCount: 0, totalPages: 1 });
    await crmClient.customers.list();
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers?page=1&pageSize=20`,
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("calls the correct URL with custom pagination", async () => {
    mockFetch(200, { items: [], totalCount: 0, totalPages: 3 });
    await crmClient.customers.list(2, 10);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers?page=2&pageSize=10`,
      expect.any(Object)
    );
  });

  it("returns parsed response data", async () => {
    const mockData = {
      items: [{ id: "1", displayName: "Alice" }],
      totalCount: 1,
      totalPages: 1,
    };
    mockFetch(200, mockData);
    const result = await crmClient.customers.list();
    expect(result).toEqual(mockData);
  });

  it("throws the error message from the response body", async () => {
    mockFetch(500, { message: "Internal server error" });
    await expect(crmClient.customers.list()).rejects.toThrow("Internal server error");
  });

  it("throws a generic error when response body has no message", async () => {
    mockFetch(404, {});
    await expect(crmClient.customers.list()).rejects.toThrow(
      "API request failed with status 404"
    );
  });
});

describe("crmClient.customers.getById", () => {
  it("calls the correct URL", async () => {
    mockFetch(200, { id: "abc123" });
    await crmClient.customers.getById("abc123");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers/abc123`,
      expect.any(Object)
    );
  });
});

describe("crmClient.customers.create", () => {
  it("sends a POST request with JSON body", async () => {
    const input = {
      firstName: "Bob",
      lastName: "Smith",
      email: "bob@example.com",
      customerType: "Regular" as const,
    };
    mockFetch(201, { id: "new-id", ...input });
    await crmClient.customers.create(input);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });
});

describe("crmClient.customers.delete", () => {
  it("sends a DELETE request and handles 204 no-content", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: jest.fn(),
    } as unknown as Response);
    const result = await crmClient.customers.delete("abc123");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers/abc123`,
      expect.objectContaining({ method: "DELETE" })
    );
    expect(result).toBeUndefined();
  });
});

describe("crmClient.customers.updateStatus", () => {
  it("sends a PUT request with status body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: jest.fn(),
    } as unknown as Response);
    await crmClient.customers.updateStatus("abc123", { status: "Inactive" });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers/abc123/status`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ status: "Inactive" }),
      })
    );
  });
});

describe("crmClient.customers.updateType", () => {
  it("sends a PUT request with customerType body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: jest.fn(),
    } as unknown as Response);
    await crmClient.customers.updateType("abc123", { customerType: "InstitutionalBuyer" });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/customers/abc123/type`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ customerType: "InstitutionalBuyer" }),
      })
    );
  });
});
