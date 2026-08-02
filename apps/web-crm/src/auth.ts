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
      session.accessToken = token.accessToken as string | undefined;
      session.systems = (token.systems as string[]) ?? [];
      session.role = (token.role as string) ?? "Staff/Employee";
      session.isSuperUser = (token.isSuperUser as boolean) ?? false;
      session.permissions = token.permissions ?? {};
      return session;
    },
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthPath = pathname.startsWith("/api/auth");
      const isProxyPath = pathname.startsWith("/api/crm") || pathname.startsWith("/hubs/");
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

      if (!isAuthPath && !isSignInPage && !isAccessDeniedPage && !isProxyPath) {
        return false; // Redirect to signin
      }
      return true;
    },
  },
});
