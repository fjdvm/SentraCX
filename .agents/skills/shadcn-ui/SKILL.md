---
name: shadcn-ui
description: Rules for using shadcn/ui components and lucide-react icons in apps/web-crm. Load when building or editing any UI — new pages, new components, or edits to existing screens.
category: Frontend
---

## Objective
Ensure all UI in `apps/web-crm` is built from shadcn/ui primitives and lucide-react icons — never hand-rolled components, custom modals/dropdowns/icons, or hardcoded colors — so the app stays visually and structurally consistent.

## Instructions

1. Before writing any component, check in this order:
- Is it already installed in `apps/web-crm/src/components/ui/`? If so, import and use it — don't re-implement or copy its internals into a feature file.
- Does shadcn/ui have it but it's not installed yet? Install it: `npx shadcn@latest add <component-name>`. This repo uses style `new-york`, base color `neutral` (matches `components.json` automatically — don't pass different flags).
- Is there a matching pattern in `.design-ref/`? If nothing matches, ask before improvising.
- Only if shadcn has no equivalent (e.g. a sentiment-trend chart, a ticket Kanban board), build custom — but compose it out of existing shadcn primitives (Card, Badge, Tooltip, etc.), not raw HTML elements.

2. Icons:
- Only `lucide-react`. Never `react-icons`, `heroicons`, `@radix-ui/react-icons`, or inline/copy-pasted SVGs.
- Import individually: `import { AlertTriangle, MessageSquare } from "lucide-react"`.
- If a needed icon doesn't exist in lucide-react, ask — don't fall back to another library or a raw SVG.

3. Styling:
- Colors only from `globals.css` design tokens (OKLCH vars) — never a hardcoded hex/rgb, never an arbitrary Tailwind color class (`text-red-500`) unless no themed token exists.
- Use Tailwind v4 utilities for layout/spacing; don't write custom CSS for things Tailwind already covers.
- Fonts are fixed: Hanken Grotesk (body/UI), Geist Mono (code/numeric). Don't introduce another font without asking.

4. Composing vs. modifying primitives:
- Don't edit files inside `components/ui/` to add feature-specific behavior — it breaks future `shadcn add` updates and couples a shared primitive to one feature.
- Compose instead: wrap the primitive in a feature-level component (e.g. `components/tickets/ticket-status-badge.tsx` built on `<Badge>`) and put feature logic there.
- Exception: genuine design-system-wide changes (e.g. changing the default Button radius app-wide) belong in `components/ui/` — confirm it's a global change, not a one-screen fix, before touching it.

5. Review checklist — flag any of these in a PR:
- A hand-written `<div>`-based modal/dropdown/tooltip instead of shadcn's `Dialog` / `DropdownMenu` / `Tooltip`.
- A literal color value instead of a `globals.css` token.
- Any non-lucide icon import.
- A copy-pasted, slightly-modified `components/ui/*.tsx` file living inside a feature folder.
- A new component duplicating one already installed under a different name.