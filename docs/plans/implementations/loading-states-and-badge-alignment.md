# Implementation Plan: Loading States & Badge Alignment

## 1. Fix loading states (BUG-10, BUG-11, BUG-12)
- **`useCustomerOrders.ts` (BUG-11):** Reset/set `isLoading = true` at the beginning of the `useEffect` body when `customerId` changes.
- **`useCustomerMarketingHistory.ts` (BUG-12):** Ensure `isLoading` is set to `true` when dependencies (like page or customerId) change.
- **`CustomerOverviewTab.tsx` (BUG-10):** Destructure `isLoading` from both `useCustomerOrders` and `useCustomerMarketingHistory`. If either is loading, show a skeleton loading state instead of rendering "No recent orders" or "No recent marketing history".
- **`CustomerMarketingHistoryTab.tsx` (BUG-12):** Disable pagination buttons when `isLoading` is true to prevent double clicks and race conditions.

## 2. Table Badge and Column Alignment
Standardize the cells and headers in all table components to use consistent left-alignment (`justify-start` or similar) instead of `justify-around` or `justify-center`, ensuring badges align cleanly with text columns.

### Affected files:
- `apps/web-crm/src/components/features/customers/CustomerTable.tsx`
- `apps/web-crm/src/components/features/campaigns/CampaignTable.tsx`
- `apps/web-crm/src/components/features/promotions/PromotionTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketsCustomerView.tsx`
- `apps/web-crm/src/components/features/customers/CustomerMarketingHistoryTab.tsx`
- `apps/web-crm/src/components/features/customers/CustomerOrderHistoryTab.tsx`
