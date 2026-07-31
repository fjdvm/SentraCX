# Centralized Auth & Access Control (EPIC INT-4) — Logout Redirection Plan

This plan details the steps to modify the logout action in **SentraCX (web-crm)** to perform a federated OIDC logout against **internal-auth-service** (OpenIddict), ensuring user sessions are terminated on both the local application and the centralized identity provider.

## Goal Description
Currently, clicking the "Sign out" button in `web-crm`'s sidebar clears only the NextAuth local session cookie. Because the user's session cookie with the OIDC provider (`internal-auth-service`) remains active, returning to `/signin` logs the user back in automatically without credentials. 

To enable a true sign-out / switch-account capability:
- Redirect the user to the OIDC provider's logout endpoint (`/connect/logout`) with the registered `post_logout_redirect_uri` parameter pointing back to `web-crm` (`https://localhost:3005/`).
- The OIDC provider will terminate the identity session and redirect the user back to `web-crm`, where the NextAuth middleware will intercept the unauthenticated request and show the sign-in page.

---

## User Review Required
No architectural changes or migrations are needed.
> [!NOTE]
> The logout redirect relies on the OIDC issuer URL. Since the OIDC provider runs on `https://localhost:5001`, the logout redirection target is hardcoded/configured to point to `https://localhost:5001/connect/logout`.

---

## Proposed Changes

### 1. Web CRM Frontend (`apps/web-crm`)

#### [MODIFY] `apps/web-crm/src/components/shared/SidebarProfileFooter.tsx`
Update the `signOut` trigger to redirect the user to the OpenIddict logout endpoint after clearing the local session.
```tsx
          <DropdownMenuItem
            onClick={() => {
              signOut({
                callbackUrl: "https://localhost:5001/connect/logout?post_logout_redirect_uri=https://localhost:3005/",
              });
            }}
            className="cursor-pointer text-xs font-medium gap-2 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </DropdownMenuItem>
```

---

## Verification Plan

### Automated Tests
Run unit and linting tests on `web-crm`:
```bash
npm run test --workspace=apps/web-crm
```

### Manual Verification
1. Start all services (`npm run dev`).
2. Log in to `web-crm` (`https://localhost:3005`) via OIDC.
3. Click "Sign out" in the sidebar profile dropdown.
4. Verify you are redirected to `https://localhost:5001/connect/logout...` and then immediately back to the `/signin` page on `https://localhost:3005/signin`.
5. Try clicking login again and verify that the provider **prompts for credentials** instead of logging in automatically, demonstrating that the OIDC session was successfully destroyed.
