# Implementation Report: Loading States & Table Layout Migration

## What was built
- Verified that loading states for customer profiles sub-tabs (overview, orders, marketing history) are already properly implemented in the codebase (hooks set `isLoading = true` and `CustomerOverviewTab` renders Skeletons during load).
- Replaced custom flexbox-based table layouts (`flex`, `flex-1`, etc.) with native HTML fixed-table layouts (`table-fixed`) across all main tables. Explicitly set percentage-based widths on columns (`w-[30%]`, `w-[15%]`, etc.), which ensures that all columns and their contents (including badges) align column-wise.

## Key architectural decisions
- Replaced the flex-layout spacing logic (`justify-around` and `justify-start`) inside table elements (`tr`/`td`/`th`) with standard native table behavior (`table-fixed`). HTML tables inherently group cells into columns, guaranteeing that all columns and their badges align column-wise.

## Files touched
- `apps/web-crm/src/components/features/customers/CustomerTable.tsx`
- `apps/web-crm/src/components/features/campaigns/CampaignTable.tsx`
- `apps/web-crm/src/components/features/promotions/PromotionTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketsCustomerView.tsx`
- `docs/plans/implementations/loading-states-and-badge-alignment.md`
