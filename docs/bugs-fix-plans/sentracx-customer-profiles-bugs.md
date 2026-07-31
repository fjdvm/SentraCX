# 🐛 SentraCX Customer Profiles Module — Bug Fix Plan

**Date:** 2026-08-01  
**Module:** `SentraCX/apps/api-crm` (backend) + `SentraCX/apps/web-crm` (frontend)  
**Scope:** Customer Profiles feature — CRUD, validation, state management, UX

---

## Priority 1: Critical (Data Integrity & Logic Errors)

### BUG-01: `UpdateType` returns 404 when Lead restriction is hit (ambiguous response)

**Backend** — `CustomersController.cs:46` / `CustomerService.cs:80`

The `UpdateTypeAsync` method returns `false` both when the customer is not found AND when the Lead restriction prevents the change. The controller maps both to `NotFound()`. The frontend can't distinguish "customer doesn't exist" from "business rule violation".

**Fix:** Return a distinct result (e.g., `400 Bad Request` with message) when the Lead restriction applies.

---

### BUG-02: Frontend allows "VIP" and "Lead" types but backend validator rejects them (Resolved ✅)

**Backend** — `CreateCustomerRequestValidator.cs:19`

The validator only accepts `"Regular"` or `"InstitutionalBuyer"`. But the frontend form (`CustomerFormSheet.tsx:157-160`) offers "VIP" and "Lead" as options. The frontend type system (`customer.ts:1`) also includes "VIP" | "Lead". Creating a VIP or Lead customer via the form will fail with a 400 validation error.

**Fix:** Either expand the backend validator to accept `"VIP"` and `"Lead"`, or remove those options from the frontend form (keep them read-only for webhook-created customers).

---

### BUG-03: Whitespace-only names pass frontend validation but submit empty strings

**Frontend** — `customer-validators.ts:4-5` / `CustomerFormSheet.tsx:78`

`z.string().min(1)` allows `"   "` (whitespace). The `onSubmit` handler trims values before sending. So `firstName: "   "` passes validation → `.trim()` → `""` is sent to the API → backend `NotEmpty()` should catch it, but the UX is poor (validation passes, then server rejects).

**Fix:** Add `.trim()` transform to the Zod schema or use `.regex(/\S/, "First name is required")`.

---

### BUG-04: No duplicate email check on customer creation

**Backend** — `CustomerService.cs:39-65`

`CreateAsync` creates a user and profile without checking if a customer with the same email already exists. This can create duplicate records. The `GetByEmailAsync` method exists but is never called during creation.

**Fix:** Add a duplicate email check at the start of `CreateAsync` and return a conflict error.

---

## Priority 2: High (UX & State Management)

### BUG-05: Background polling overwrites optimistic UI updates (type change flicker)

**Frontend** — `useCustomer.ts:38-52`

The 10-second poll in `useCustomer` overwrites local `setCustomer` calls. After `CustomerTypeControl` updates the type optimistically, the next poll can revert it if the server hasn't propagated yet.

**Fix:** Add a "skip next poll" flag after optimistic updates, or compare timestamps before applying poll results.

---

### BUG-06: Race condition — dual fetch logic in `useCustomers` and `useCustomer`

**Frontend** — `useCustomers.ts:20-36` and `useCustomers.ts:38-63`

The `fetchCustomers` callback (returned as `refetch`) and the `useEffect` both independently call the API. Calling `refetch()` while the poll is in-flight can cause concurrent state writes with no coordination.

**Fix:** Unify into a single fetch mechanism. Have `refetch` trigger the same logic as the effect, or use an AbortController to cancel stale requests.

---

### BUG-07: KPI "Total Customers" shows filtered count, not actual total (Resolved ✅)

**Frontend** — `CustomerProfiles.tsx:63`

The `totalCount` from `useCustomers` is the count matching the current filter (tab + search). The KPI card shows this as "Total Customers / Registered accounts" which is misleading.

**Fix:** Either make a separate unfiltered count API call for the KPI, or relabel it as "Matching results".

---

### BUG-08: Search query persists across tab switches

**Frontend** — `CustomerProfiles.tsx:35-37`

`handleTabChange` resets `page` but not `searchQuery`/`debouncedSearch`. Switching from Contacts→Leads keeps the search active, which may return empty/confusing results.

**Fix:** Reset `searchQuery` and `setDebouncedSearch("")` inside `handleTabChange`.

---

### BUG-09: CustomerFormSheet defaults to "Regular" regardless of active tab

**Frontend** — `CustomerFormSheet.tsx:54`

If user is on "Leads" tab and clicks "Add Customer", the form defaults to `customerType: "Regular"`.

**Fix:** Pass the active tab context as a prop and use it as the default customer type.

---

## Priority 3: Medium (Missing Error Handling & Loading States)

### BUG-10: Overview tab shows "No data" during loading (missing loading state)

**Frontend** — `CustomerOverviewTab.tsx`

The component uses `useCustomerOrders` and `useCustomerMarketingHistory` but discards `isLoading` states. While data is loading, "No recent orders" is shown instead of a skeleton/spinner.

**Fix:** Destructure `isLoading` from hooks and show loading indicators.

---

### BUG-11: `useCustomerOrders` doesn't set `isLoading` on dependency change

**Frontend** — `useCustomerOrders.ts`

Initial `isLoading` is computed from `Boolean(customerId)`. When `customerId` changes (navigate to different customer), the effect re-runs but `isLoading` stays `false` — no loading state shown.

**Fix:** Add `setIsLoading(true)` at the start of the useEffect body.

---

### BUG-12: `useCustomerMarketingHistory` — same missing loading state on page change

**Frontend** — `useCustomerMarketingHistory.ts`

When the user paginates, no loading indicator is shown during fetch. Pagination buttons also aren't disabled during loading.

**Fix:** Set loading state at the start of effect; disable pagination buttons when `isLoading`.

---

### BUG-13: `CustomerNotesEditor` — stale `initialNotes` prop not synced to local state

**Frontend** — `CustomerNotesEditor.tsx`

`useState(initialNotes)` captures the prop only on first render. If polling updates the notes externally, the editor shows stale data when entering edit mode.

**Fix:** Use a `useEffect` to sync `initialNotes` → local state when not in edit mode.

---

## Priority 4: Low (Minor & Defensive)

### BUG-14: No pagination for Order History tab (Resolved ✅)

**Frontend** — `useCustomerOrders.ts` / `CustomerOrderHistoryTab.tsx`

All orders are fetched at once with no pagination. For customers with many orders, this is a performance concern.

**Fix:** Add pagination params to the API call and UI pagination controls.

---

### BUG-15: `SoftDeleteAsync` doesn't mark the `CustomerProfile` — only the `User`

**Backend** — `CustomerService.cs:97`

Soft delete only sets `profile.User.IsDeleted = true`. The profile itself remains in the DB with no deleted flag. The repository filters by `!cp.User.IsDeleted`, which works, but other queries that don't join User could surface deleted profiles.

**Fix:** Consider also setting a `DeletedAt` or `IsDeleted` on the profile, or ensure all queries go through the repository.

---

### BUG-16: `UpdateTypeAsync` validator allows "Regular"/"InstitutionalBuyer" — no "VIP"

**Backend** — `UpdateCustomerTypeRequestValidator.cs:12`

Same as BUG-02 but for updates: the validator restricts to `"Regular" | "InstitutionalBuyer"`, so a VIP customer can never be changed TO VIP, and there's no way to promote a customer to VIP via this endpoint.

**Fix:** Align allowed types across create/update validators and frontend.

---

### BUG-17: Date formatting without null check in `CustomerTable` (Resolved ✅)

**Frontend** — `CustomerTable.tsx`

`new Date(c.createdAt).toLocaleDateString()` — if `createdAt` is null/invalid, this shows "Invalid Date".

**Fix:** Add a null guard and use consistent date formatting (e.g., `date-fns`).

---

## Recommended Execution Order

| Phase | Bugs | Effort |
|-------|------|--------|
| Phase 1 | BUG-02, BUG-03, BUG-08, BUG-09 | ~2 hours (quick fixes) |
| Phase 2 | BUG-01, BUG-04, BUG-07 | ~3 hours (backend logic + new API) |
| Phase 3 | BUG-05, BUG-06 | ~3 hours (hook refactoring) |
| Phase 4 | BUG-10, BUG-11, BUG-12, BUG-13 | ~2 hours (loading states) |
| Phase 5 | BUG-14, BUG-15, BUG-16, BUG-17 | ~2 hours (cleanup) |

**Total estimated effort: ~12 hours**
