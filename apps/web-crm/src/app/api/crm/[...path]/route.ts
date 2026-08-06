import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Allow self-signed certificates for the CRM API in development
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL ?? "https://localhost:5005";

async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetPath = `/api/v1/${path.join("/")}`;
  const url = new URL(targetPath, CRM_API_URL);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!["host", "connection", "transfer-encoding", "cookie"].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // Inject Authorization Bearer token from NextAuth session if missing from request headers
  if (!headers["authorization"]) {
    try {
      const session = await auth();
      if (session?.accessToken) {
        headers["authorization"] = `Bearer ${session.accessToken}`;
      }
    } catch {
      // Ignore if session lookup fails
    }
  }
  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.arrayBuffer();
      if (body.byteLength > 0) {
        fetchOptions.body = Buffer.from(body);
      }
    }

    const response = await fetch(url.toString(), fetchOptions);
    const responseBody = await response.arrayBuffer();

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);
    if (NULL_BODY_STATUSES.has(response.status) || responseBody.byteLength === 0) {
      return new NextResponse(null, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(Buffer.from(responseBody), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`CRM API proxy error for ${request.method} ${url.toString()}:`, errMsg);
    return NextResponse.json(
      { error: `Failed to connect to CRM API: ${errMsg}` },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}
