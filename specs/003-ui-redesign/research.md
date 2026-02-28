# Research: UI Redesign & Design System

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Date**: 2026-02-28
**Status**: ✅ Complete

---

## Executive Summary

Design direction is **pre-approved** via the reference project at `C:\Users\Fede\ILPI\diseño`. No unknowns require resolution. Implementation can proceed directly to Phase 1 design and Phase 2 tasks.

---

## Design System Reference Analysis

### Color Palette

**Source**: `C:\Users\Fede\ILPI\diseño` project review

- **Primary**: Indigo-600 (`#4F46E5`)
  - Used for: Primary action buttons, links, highlights, focus states
  - Rationale: Modern, professional, high contrast for accessibility

- **Neutrals**: Slate scale
  - Backgrounds: Slate-50 (page), Slate-100 (cards), Slate-200 (borders)
  - Text: Slate-700 (body), Slate-900 (headings)
  - Rationale: Professional, easy to read, reduces eye strain

- **Semantic Colors**:
  - Success: Green-600 (approved, active, confirmed)
  - Warning: Yellow-600 (pending, attention needed)
  - Error: Red-600 (rejected, errors, invalid)
  - Info: Blue-600 (informational messages)

### Typography

- **Font Stack**: System fonts (sans-serif preference)
- **Headings**: Bold, Slate-900, generous line-height
- **Body Text**: Regular weight, Slate-700
- **Sizes**: Tailwind defaults (text-sm, text-base, text-lg, text-xl, text-2xl)
- **Line Height**: 1.5x for readability

### Spacing & Layout

- **Unit**: 4px (Tailwind base)
- **Padding/Margin**: Tailwind scale (p-2, p-4, p-6, p-8, etc.)
- **Gap in Grids**: Consistent spacing between elements
- **Max Width**: Container-based, responsive breakpoints

### Shadows & Elevation

- **Subtle**: `shadow-sm` for cards, form inputs
- **Medium**: `shadow-md` for modals, dropdowns
- **Large**: `shadow-lg` for overlays
- **Rationale**: Depth hierarchy without visual clutter

### Border & Radius

- **Borders**: 1px, Slate-200, used sparingly
- **Border Radius**:
  - Small (2px): Inputs, small components
  - Medium (6px): Cards, buttons
  - Large (8px): Modals, main containers
- **Rationale**: Modern, approachable appearance

---

## Component Library Analysis

### Existing React Stack

✅ **Available**:
- React 19 (latest)
- TypeScript 5.8+ (strict mode)
- Tailwind CSS v3+ (configured)
- Lucide React (icon library)
- React Router v7 (routing)
- Axios (HTTP client)

✅ **Testing Infrastructure**:
- Vitest (unit tests)
- React Testing Library (component tests)
- Lighthouse (accessibility audits)

**Decision**: No new dependencies required. Use existing stack to build component library.

### Component Scope (15-20 components)

**Core Components** (always needed):
1. **Button** — Primary, secondary, danger variants; sizes (sm, md, lg)
2. **Input** — Text, email, password, number inputs; with error states
3. **Card** — Container with consistent padding/border/shadow
4. **Badge** — Status labels with color variants
5. **Modal** — Dialog box with header/body/footer/actions
6. **Alert** — Info/success/warning/error boxes
7. **Table** — Data table with headers, sorting, pagination

**Extended Components** (for views):
8. **Spinner** — Loading indicator
9. **Toast** — Toast notification system
10. **Breadcrumb** — Navigation breadcrumbs
11. **Tabs** — Tab navigation interface
12. **Dropdown** — Dropdown menu/select
13. **Checkbox** — Checkbox input
14. **Radio** — Radio button group
15. **Select** — Dropdown select
16. **Textarea** — Multi-line text input
17. **Form** — Form wrapper with consistent spacing
18. **Label** — Form labels with accessibility
19. **Pagination** — List pagination controls
20. **Empty State** — No data/empty result display

---

## Accessibility Strategy

**Target**: WCAG AA compliance (minimum requirement from Constitution)

### Color Contrast

- **Normal Text**: 4.5:1 ratio (Indigo-600 on white background ✓)
- **Large Text**: 3:1 ratio (larger headings)
- **Testing**: Lighthouse accessibility audit ≥90

### Keyboard Navigation

- All interactive elements tab-reachable
- Focus visible (2px outline in Indigo-600)
- Escape key closes modals
- Enter/Space activates buttons

### ARIA Labels

- Buttons with icons include `aria-label`
- Form inputs have associated `<label>` elements
- Modals use `role="dialog"` and `aria-labelledby`
- Loading states use `aria-busy="true"`

### Color + Text Indicators

- Status never communicated by color alone
- Icons + text for success/error/warning states
- Example: ✓ Success (text) + Green (color)

---

## Performance Targets

**Goal**: No regression from current performance; bundle size increase ≤20KB

### Bundle Analysis

**Current Frontend**:
- React + Router: ~100KB (gzip)
- Tailwind CSS: ~40KB (tree-shaken)
- Other deps: ~50KB
- **Total**: ~190KB

**After Component Library**:
- New components (JS): ~8KB
- Design tokens + types: ~2KB
- Tailwind utilities (already included): 0KB additional
- **Total increase**: ~10KB ✓ (well below 20KB limit)

### Optimization Strategies

1. **Code Splitting**: Views lazy-loaded via React Router (already in place)
2. **CSS Tree-Shaking**: Tailwind removes unused classes (automatic)
3. **Component Memoization**: Use `React.memo()` for expensive components
4. **Image Optimization**: Defer to post-MVP if needed

---

## Implementation Approach

### Phase 1: Design System Documentation

1. Create `data-model.md` with complete design system definition
2. Create component interface contracts in `contracts/` folder
3. Create `quickstart.md` developer integration guide

### Phase 2: Component Library Implementation

1. Create `frontend/src/components/ui/` folder structure
2. Implement core components (Button, Input, Card, Alert, Modal)
3. Implement extended components (Table, Badge, Spinner, Toast, etc.)
4. Add unit tests for each component
5. Add accessibility audit via Lighthouse

### Phase 3: View Refactoring

1. Update Layout, Header, Sidebar to use library components
2. Refactor views one by one (Dashboard → Employees → Shifts → Vacations → Reports → Settings)
3. Remove old CSS files as views are updated
4. Verify Lighthouse accessibility score ≥90 for each view

### Phase 4: Quality & Deployment

1. Full visual regression testing across all views
2. Cross-browser testing (Chrome, Safari, Firefox)
3. Responsive testing (375px, 768px, 1280px breakpoints)
4. Final accessibility audit
5. Commit and prepare for merge

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Large refactoring scope** | Time overrun | Break into phases; implement core components first |
| **Breaking existing views** | Regression bugs | Comprehensive component tests; visual regression suite |
| **Browser compatibility** | User experience issues | Test on Chrome, Safari, Firefox; use Tailwind defaults |
| **Accessibility overlooked** | WCAG non-compliance | Lighthouse audit for each view; keyboard testing |
| **Bundle size bloat** | Performance regression | Monitor build output; use code splitting; tree-shake CSS |

---

## Decision Records

### DR-001: Tailwind CSS for Design System

**Decision**: Use Tailwind CSS (already in stack) instead of CSS-in-JS or styled components.

**Rationale**:
- Already configured and optimized in project
- Tree-shaking removes unused classes
- Consistent with design reference project (`C:\Users\Fede\ILPI\diseño`)
- No additional dependencies
- Excellent TypeScript support

### DR-002: Separate Component Library Folder

**Decision**: Create dedicated `frontend/src/components/ui/` folder for design system components.

**Rationale**:
- Clearly separates reusable library from feature-specific components
- Easier to discover and reuse components
- Prevents bloat in main components folder
- Standard practice in design systems (ShadCN, MUI, etc.)

### DR-003: No Third-Party UI Library

**Decision**: Build custom components using Tailwind instead of integrating Chakra UI, MUI, or ShadCN.

**Rationale**:
- Project has specific design requirements (Indigo + Slate)
- Building custom is faster than adapting third-party library
- Reduces bundle size and dependencies
- Full control over accessibility implementation
- Aligns with Constitution's "minimize dependencies" principle

---

## Conclusion

✅ **Research Complete** — Design direction is clear, no unknowns blocking implementation. Proceed to Phase 1 (design system documentation) and Phase 2 (component implementation).

All decisions documented. No conflicts with project Constitution. Ready for task generation.
