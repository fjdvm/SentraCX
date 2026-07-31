# Implementation Report: Loading States & Badge Alignment

## What was built
- Verified that loading states for customer profiles sub-tabs (overview, orders, marketing history) are already properly implemented in the codebase (hooks set `isLoading = true` and `CustomerOverviewTab` renders Skeletons during load).
- Standardized and aligned all badges and columns inside table layouts. Changed columns from `justify-around` to `justify-start` (and `justify-end` for the Actions columns) so that badges, text, and headers align cleanly with one another.

## Key architectural decisions
- Replaced the flex-layout spacing logic (`justify-around`) inside `tr`/`td`/`th` with left-alignment (`justify-start`), ensuring table items (specifically badges) align in a straight line relative to their column boundaries rather than shifting dynamically based on character/width variations in adjacent columns.

## Files touched
- `apps/web-crm/src/components/features/customers/CustomerTable.tsx`
- `apps/web-crm/src/components/features/campaigns/CampaignTable.tsx`
- `apps/web-crm/src/components/features/promotions/PromotionTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketTable.tsx`
- `apps/web-crm/src/components/features/tickets/TicketsCustomerView.tsx`
- `docs/plans/implementations/loading-states-and-badge-alignment.md`
