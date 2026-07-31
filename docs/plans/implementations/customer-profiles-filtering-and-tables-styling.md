# Implementation Plan: Customer Profiles Filtering & Table Standardization

This plan outlines the changes required to add a customer type filter dropdown in customer profiles and standardize all tables across the Next.js CRM workspace.

## 1. Customer Profiles Filtering (Dropdown)
- **Component**: `apps/web-crm/src/components/features/customers/CustomerProfiles.tsx`
- **Dropdown Options**:
  - **All**: Fetches contacts (`customerType = "Contact"`)
  - **Regular**: Fetches regular customers (`customerType = "Regular"`)
  - **Institutional**: Fetches institutional buyers (`customerType = "InstitutionalBuyer"`)
- **State management**:
  - Track `customerTypeFilter` state in `CustomerProfiles`.
  - Pass the current value down to `CustomerTable` to show the filter selection UI.
  - Reset pagination page to `1` when filter changes.

## 2. Table Standardization (Fixed Height, Scrollable, 20-row Pagination)
All tables in the project will be modified to:
1. Have a fixed height (e.g., wrapper `h-[480px]` or `max-h-[480px]` with `overflow-auto`).
2. Have sticky headers (`sticky top-0 bg-card z-10`).
3. Support pagination with exactly **20 rows per page**.

### Affected Tables & Components:

#### A. Customers Registry
- **Parent**: `apps/web-crm/src/components/features/customers/CustomerProfiles.tsx`
- **Table**: `apps/web-crm/src/components/features/customers/CustomerTable.tsx`
- **Action**: Add dropdown UI. Set fixed height container. Page size is already 20.

#### B. Campaigns Audit Log
- **Parent/Table**: `apps/web-crm/src/components/features/campaigns/CampaignTable.tsx`
- **Action**: Implement frontend pagination (20 rows per page). Wrap table in a fixed height scrollable container.

#### C. Promotions Log
- **Parent/Table**: `apps/web-crm/src/components/features/promotions/PromotionTable.tsx`
- **Action**: Implement frontend pagination (20 rows per page). Wrap table in a fixed height scrollable container.

#### D. Support Ticket Queue (Staff View)
- **Parent**: `apps/web-crm/src/components/features/tickets/Tickets.tsx`
- **Table**: `apps/web-crm/src/components/features/tickets/TicketTable.tsx`
- **Action**: Change `useTickets` call to use pagination (20 rows per page instead of 50). Add pagination controls. Wrap table in a fixed height scrollable container.

#### E. Support Ticket Queue (Customer View)
- **Parent**: `apps/web-crm/src/components/features/tickets/TicketsCustomerView.tsx`
- **Action**: Change `useTickets` call to use pagination (20 rows per page instead of 50). Add pagination controls. Wrap table in a fixed height scrollable container.

#### F. Customer Marketing History Tab
- **Component**: `apps/web-crm/src/components/features/customers/CustomerMarketingHistoryTab.tsx`
- **Action**: Change `pageSize` from 10 to 20. Wrap table in a fixed height scrollable container.

#### G. Customer Order History Tab
- **Component**: `apps/web-crm/src/components/features/customers/CustomerOrderHistoryTab.tsx`
- **Action**: Change `pageSize` from 10 to 20. Wrap table in a fixed height scrollable container.
