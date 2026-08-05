import NextAuth from "next-auth";

async function refreshAccessToken(token: any) {
  try {
    const url = `${process.env.AUTH_ISSUER}/connect/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AUTH_CRMS_CLIENT_ID!,
        client_secret: process.env.AUTH_CRMS_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}


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
          scope: "openid profile email systems offline_access",
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
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
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

      // If there is no expiration (e.g. no token yet), just return
      if (!token.expiresAt) return token;

      // Return previous token if the access token has not expired yet
      // We buffer by 5 minutes (300 seconds)
      if (Date.now() < ((token.expiresAt as number) - 300) * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      if (token.refreshToken) {
        return await refreshAccessToken(token);
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
        } else if (pathname.startsWith("/campaigns")) {
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
