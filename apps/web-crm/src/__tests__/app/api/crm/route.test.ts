/**
 * @jest-environment node
 */
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { GET, POST, PUT, DELETE, PATCH } from "@/app/api/crm/[...path]/route";

describe("CRM API Proxy Route Handler", () => {
  const originalFetch = global.fetch;

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    (auth as jest.Mock).mockResolvedValue({ accessToken: "mock-session-token" });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
    jest.resetAllMocks();
  });

  function createRequest(
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: string } = {}
  ): NextRequest {
    const { method = "GET", headers = {}, body } = options;
    const req = new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers: new Headers(headers),
      body: body ? Buffer.from(body) : undefined,
    });
    return req;
  }

  it("handles 204 No Content response from backend without throwing null body error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 204,
      headers: new Headers({ "x-custom-header": "test-val" }),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response);

    const req = createRequest("http://localhost:3000/api/crm/tickets/123/claim", {
      method: "PUT",
    });
    const context = { params: Promise.resolve({ path: ["tickets", "123", "claim"] }) };

    const res = await PUT(req, context);

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(res.headers.get("x-custom-header")).toBe("test-val");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://localhost:5005/api/v1/tickets/123/claim",
      expect.objectContaining({
        method: "PUT",
      })
    );
  });

  it("handles 200 OK with JSON response body", async () => {
    const mockData = { id: "ticket-1", title: "Cannot login" };
    const encoded = new TextEncoder().encode(JSON.stringify(mockData));

    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      arrayBuffer: jest.fn().mockResolvedValue(encoded.buffer),
    } as unknown as Response);

    const req = createRequest("http://localhost:3000/api/crm/tickets/ticket-1", {
      method: "GET",
    });
    const context = { params: Promise.resolve({ path: ["tickets", "ticket-1"] }) };

    const res = await GET(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockData);
  });

  it("forwards query parameters properly to CRM backend", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response);

    const req = createRequest(
      "http://localhost:3000/api/crm/tickets?page=2&pageSize=10&status=Unclaimed",
      { method: "GET" }
    );
    const context = { params: Promise.resolve({ path: ["tickets"] }) };

    await GET(req, context);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://localhost:5005/api/v1/tickets?page=2&pageSize=10&status=Unclaimed",
      expect.any(Object)
    );
  });

  it("handles fetch errors gracefully by returning 502", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Connection refused"));

    const req = createRequest("http://localhost:3000/api/crm/tickets/123/claim", {
      method: "PUT",
    });
    const context = { params: Promise.resolve({ path: ["tickets", "123", "claim"] }) };

    const res = await PUT(req, context);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("Failed to connect to CRM API: Connection refused");
  });

  it("supports POST, DELETE, and PATCH methods", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 204,
      headers: new Headers(),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response);

    const postReq = createRequest("http://localhost:3000/api/crm/tickets", {
      method: "POST",
      body: JSON.stringify({ title: "New Issue" }),
    });
    await POST(postReq, { params: Promise.resolve({ path: ["tickets"] }) });

    const deleteReq = createRequest("http://localhost:3000/api/crm/customers/123", {
      method: "DELETE",
    });
    await DELETE(deleteReq, { params: Promise.resolve({ path: ["customers", "123"] }) });

    const patchReq = createRequest("http://localhost:3000/api/crm/customers/123", {
      method: "PATCH",
    });
    await PATCH(patchReq, { params: Promise.resolve({ path: ["customers", "123"] }) });

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
  it("injects Authorization Bearer token from session when not present in request headers", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response);

    const req = createRequest("http://localhost:3000/api/crm/campaigns", {
      method: "GET",
    });
    const context = { params: Promise.resolve({ path: ["campaigns"] }) };

    await GET(req, context);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://localhost:5005/api/v1/campaigns",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer mock-session-token",
        }),
      })
    );
  });
});
