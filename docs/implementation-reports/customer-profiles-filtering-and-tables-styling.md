# Implementation Report: Customer Profiles Filtering & Table Standardization

## What was built
- Added a **Customer Type** filter dropdown in the Customer Profiles component. Users can filter by **All Contacts** (Active Contact registry), **Regular** customers, and **Institutional** buyers.
- Standardized all lists/tables across the CRM to have a **fixed height** (`h-[480px]` or `h-[400px]`), making them scrollable (`overflow-auto`) with **sticky headers** (`sticky top-0 bg-card z-10`).
- Implemented **20-row pagination** on all tables, switching any hardcoded page sizes from `10` or `50` to `20`.

## Key architectural decisions
- Retained server-side filtering and pagination where already supported (`CustomerProfiles`, `Tickets`, `TicketsCustomerView`, `CustomerMarketingHistoryTab`).
- Implemented client-side pagination for components consuming non-paginated API endpoints (`CampaignTable`, `PromotionTable`, `CustomerOrderHistoryTab`).
- Reset pagination pages to `1` on filter or search parameter change to avoid empty states.

## Files touched
- `apps/web-crm/src/components/features/customers/CustomerProfiles.tsx`
- `apps/web-crm/src/components/features/customers/CustomerTable.tsx`
- `apps/web-crm/src/components/features/campaigns/CampaignTable.tsx`
- `apps/web-crm/src/components/features/promotions/PromotionTable.tsx`
- `apps/web-crm/src/components/features/tickets/Tickets.tsx`
- `apps/web-crm/src/components/features/tickets/TicketTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketsCustomerView.tsx`
- `apps/web-crm/src/components/features/customers/CustomerMarketingHistoryTab.tsx`
- `apps/web-crm/src/components/features/customers/CustomerOrderHistoryTab.tsx`

## Testing
- Verified unit test suite compiles and runs cleanly.
- Added client-side tests run confirmation.
