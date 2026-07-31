# Centralized Auth & Access Control (EPIC INT-4) — Implementation Plan

This plan details the steps to fully integrate **SentraCX (web-crm, api-crm)** with the **internal-auth-service** (OIDC OpenIddict provider), removing the development bypasses, introducing route-level security, mapping module-level permissions, and securing backend REST and SignalR endpoints.

## Goal Description
Currently, authentication is bypassed in both the frontend (`web-crm`) and the backend (`api-crm`) for local UI/UX development. To prepare the system for production-like verification:
1. **Remove the frontend auth bypass**: Uncomment/reinstate the NextAuth `authorized` callback logic in `web-crm/src/auth.ts`.
2. **Implement App Routing Protection (NextAuth Middleware)**: Create `middleware.ts` to intercept requests. If a user is not authenticated or lacks `CRMS` system access, redirect them to the `/signin` or a new `/access-denied` page.
3. **Display Real User Information & Filter Sidebar Nav Items**: Dynamically show the logged-in user's name, email, and role from token claims in the sidebar footer instead of mocked roles. Hide sidebar nav items for modules the user doesn't have read access to.
4. **Re-enable Backend Authentication & Validate JWTs**: Uncomment the `[Authorize]` attributes in `api-crm` controllers to block unauthenticated requests. Configure `Program.cs` and CORS settings to properly validate OpenIddict bearer tokens.
5. **Forward Access Tokens from web-crm**: Attach the OIDC access token to HTTP header authorizations in the web client and SignalR connection builders.

---

## User Review Required
No breaking database migrations or breaking architectural changes are introduced. However, once implemented:
> [!IMPORTANT]
> - Users **must** log in via the OIDC login page (`internal-auth-service` on port `5001`) to access `web-crm`.
> - Seeded credentials (e.g., `alice@example.com` / `Passw0rd!123` for Super Admin, and `bob@example.com` / `Passw0rd!123` for basic employee) must be used to test different authorization tiers.

---

## Proposed Changes

### 1. Web CRM Frontend (`apps/web-crm`)

#### [NEW] `apps/web-crm/src/middleware.ts`
Create the NextAuth middleware config to trigger session authorization checks on all page requests.
```typescript
export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

#### [NEW] `apps/web-crm/src/app/access-denied/page.tsx`
A clean, styled page informing users that they lack CRMS permission or specific module permission.
```tsx
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-6">
        <ShieldAlert className="w-16 h-16" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Access Denied</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        Your account does not have permission to access the Customer Relationship Management System (CRMS) or the requested module.
      </p>
      <Link
        href="/api/auth/signout"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        Sign Out / Switch Account
      </Link>
    </div>
  );
}
```

#### [MODIFY] `apps/web-crm/src/types/next-auth.d.ts`
Extend NextAuth definitions to support OIDC custom claims for `systems`, `role`, `isSuperUser`, and fine-grained `permissions`.
```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    systems: string[];
    role: string;
    isSuperUser: boolean;
    permissions: any;
    user: DefaultSession["user"];
  }

  interface Profile {
    systems?: string;
    role?: string;
    isSuperUser?: string | boolean;
    permissions?: string | object;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    systems?: string[];
    role?: string;
    isSuperUser?: boolean;
    permissions?: any;
  }
}
```

#### [MODIFY] `apps/web-crm/src/auth.ts`
Restore the `authorized` callback, redirecting unauthorized users, and mapping custom claims.
```typescript
import NextAuth from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "authservice",
      name: "Auth Service",
      type: "oidc",
      issuer: process.env.AUTH_ISSUER,
      clientId: process.env.AUTH_CRMS_CLIENT_ID,
      clientSecret: process.env.AUTH_CRMS_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email systems",
        },
      },
    },
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        if (profile.systems) {
          token.systems = (profile.systems as string).split(",");
        }
        if (profile.role) {
          token.role = profile.role as string;
        }
        if (profile.isSuperUser) {
          token.isSuperUser = profile.isSuperUser === "true" || profile.isSuperUser === true;
        }
        if (profile.permissions) {
          try {
            token.permissions = typeof profile.permissions === "string"
              ? JSON.parse(profile.permissions)
              : profile.permissions;
          } catch (e) {
            token.permissions = {};
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.systems = (token.systems as string[]) ?? [];
      session.role = (token.role as string) ?? "Staff/Employee";
      session.isSuperUser = (token.isSuperUser as boolean) ?? false;
      session.permissions = token.permissions ?? {};
      return session;
    },
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthPath = pathname.startsWith("/api/auth");
      const isSignInPage = pathname === "/signin";
      const isAccessDeniedPage = pathname === "/access-denied";

      if (auth?.user) {
        // Enforce global system permission
        const systems = auth.systems || [];
        const hasCrmsAccess = systems.includes("CRMS");

        if (!hasCrmsAccess) {
          if (isAccessDeniedPage) return true;
          return Response.redirect(new URL("/access-denied", request.nextUrl));
        }

        // Bypass permission checks for Super Admin/CEO
        if (auth.isSuperUser) {
          if (isSignInPage || isAccessDeniedPage) {
            return Response.redirect(new URL("/", request.nextUrl));
          }
          return true;
        }

        // Enforce module-level permission
        let requiredModule: string | null = null;
        if (pathname === "/" || pathname.startsWith("/dashboard")) {
          requiredModule = "Dashboard";
        } else if (pathname.startsWith("/customers")) {
          requiredModule = "Customer Profiles";
        } else if (pathname.startsWith("/conversations")) {
          requiredModule = "Conversations";
        } else if (pathname.startsWith("/tickets")) {
          requiredModule = "Tickets";
        } else if (pathname.startsWith("/campaigns") || pathname.startsWith("/promotions")) {
          requiredModule = "Campaigns";
        } else if (pathname.startsWith("/settings")) {
          // Settings is SuperAdmin/CEO only
          if (isAccessDeniedPage) return true;
          return Response.redirect(new URL("/access-denied", request.nextUrl));
        }

        if (requiredModule) {
          const crmsPerms = auth.permissions?.CRMS;
          const hasModuleAccess = crmsPerms?.[requiredModule]?.canRead;
          if (!hasModuleAccess) {
            if (isAccessDeniedPage) return true;
            return Response.redirect(new URL("/access-denied", request.nextUrl));
          }
        }

        if (isSignInPage || isAccessDeniedPage) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      if (!isAuthPath && !isSignInPage && !isAccessDeniedPage) {
        return false; // Redirect to signin
      }
      return true;
    },
  },
});
```

#### [MODIFY] `apps/web-crm/src/app/layout.tsx`
Wrap the root layout with NextAuth's client-side `SessionProvider` to allow Client Components to fetch sessions dynamically.
```diff
+ import { SessionProvider } from "next-auth/react";

  export default async function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en" className={`${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-screen bg-background text-foreground font-sans">
+         <SessionProvider>
            <AppShell>{children}</AppShell>
+         </SessionProvider>
        </body>
      </html>
    );
  }
```

#### [MODIFY] `apps/web-crm/src/components/shared/Sidebar.tsx` and `SidebarProfileFooter.tsx`
- In `Sidebar.tsx`: Filter `mainNavItems` using session permissions.
- In `SidebarProfileFooter.tsx`: Use actual session data instead of the mocked accounts.
- We will modify `Sidebar.tsx` to read the session and filter nav links dynamically:
```typescript
// Fetch session via useSession hook:
const { data: session } = useSession();

const allowedNavItems = mainNavItems.filter((item) => {
  if (!session) return false;
  if (session.isSuperUser) return true;
  
  let modName = "";
  if (item.href === "/" || item.href === "/dashboard") modName = "Dashboard";
  else if (item.href.startsWith("/customers")) modName = "Customer Profiles";
  else if (item.href.startsWith("/conversations")) modName = "Conversations";
  else if (item.href.startsWith("/tickets")) modName = "Tickets";
  else if (item.href.startsWith("/campaigns") || item.href.startsWith("/promotions")) modName = "Campaigns";

  if (!modName) return true;
  return !!session.permissions?.CRMS?.[modName]?.canRead;
});
```

#### [MODIFY] `apps/web-crm/src/lib/api/crm-client.ts`
Update the `request` utility to dynamically append the bearer token from the session.
```typescript
  let token: string | undefined;
  if (typeof window === "undefined") {
    const { auth } = await import("@/auth");
    const session = await auth();
    token = session?.accessToken;
  } else {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    token = session?.accessToken;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
```

#### [MODIFY] `apps/web-crm/src/hooks/useSignalR.ts` and `useDashboardHub.ts`
Inject `accessTokenFactory` into the HubConnectionBuilder configurations:
```typescript
      .withUrl(`${CRM_BASE}/hubs/chat`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: async () => {
          const { getSession } = await import("next-auth/react");
          const session = await getSession();
          return session?.accessToken ?? "";
        }
      })
```

---

### 2. CRM Backend (`apps/api-crm`)

#### [MODIFY] `apps/api-crm/.env` and `.env.example`
Align `JWT_AUDIENCE` to `crms-client` which is the OIDC client identifier.
```env
JWT_AUDIENCE=crms-client
```

#### [MODIFY] Re-enable `[Authorize]` attribute on controllers:
- `Controllers/CustomersController.cs`
- `Controllers/TicketsController.cs`
- `Controllers/ConversationsController.cs`
- `Controllers/MessagesController.cs`
- `Controllers/MarketingInteractionsController.cs`
- `Controllers/OrdersController.cs`
- `Controllers/CampaignsController.cs`
- `Controllers/PromotionsController.cs`
- `Controllers/TemplatesController.cs`
- `Controllers/UploadController.cs`

---

## Verification Plan

### Automated Tests
Execute the Next.js unit tests and .NET CRM API test suite to verify no regressions:
```bash
# Frontend tests
npm run test --workspace=apps/web-crm

# Backend API tests
dotnet test apps/api-crm/tests/Crm.Api.Tests
```

### Manual Verification
1. Start the microservices: `npm run dev` in the root.
2. Navigate to `https://localhost:3005`. Confirm you are redirected to the OIDC login page (`https://localhost:5001/Account/Login`).
3. Log in with **Alice** (`alice@example.com` / `Passw0rd!123`). Confirm full access to all CRMS modules, settings, and that the app shell shows her profile.
4. Log out, and log in with **Bob** (`bob@example.com` / `Passw0rd!123`). Confirm that the sidebar navigation *only* renders Dashboard. Try navigating manually to `/customers` or `/tickets` and verify you receive an "Access Denied" page.
5. Verify SignalR logs in browser developer console to ensure connection is successfully established with Bearer headers.
