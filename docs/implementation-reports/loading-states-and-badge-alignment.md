# Implementation Report: Loading States & Table Layout Migration

## What was built
- Verified that loading states for customer profiles sub-tabs (overview, orders, marketing history) are already properly implemented in the codebase (hooks set `isLoading = true` and `CustomerOverviewTab` renders Skeletons during load).
- Replaced custom flexbox-based table layouts (`flex`, `flex-1`, etc.) with native HTML table layouts across all main tables.
- Switched tables to standard auto-width layout (`table-auto` by default) by removing `table-fixed` and pixel/percentage width allocations (`w-[...]`) from headers and cells. This allows the browser to dynamically allocate column track widths to fit the screen size, preventing the layout from overflowing the page and eliminating the horizontal scrollbar on medium to large viewports while keeping badges perfectly aligned in vertical tracks.

## Key architectural decisions
- Replaced the flex-layout spacing logic (`justify-around` and `justify-start`) inside table elements (`tr`/`td`/`th`) with standard native table behavior. HTML tables inherently group cells into columns, guaranteeing that all columns and their badges align column-wise.
- Enforced horizontal responsiveness by removing unnecessary `min-width` and `fixed-width` column constraints.

## Files touched
- `apps/web-crm/src/components/features/customers/CustomerTable.tsx`
- `apps/web-crm/src/components/features/campaigns/CampaignTable.tsx`
- `apps/web-crm/src/components/features/promotions/PromotionTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketsCustomerView.tsx`
- `docs/plans/implementations/loading-states-and-badge-alignment.md`
