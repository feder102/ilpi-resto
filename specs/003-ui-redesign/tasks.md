# Implementation Tasks: UI Redesign & Consistency

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Branch**: `003-ui-redesign`
**Date**: 2026-02-28
**Total Tasks**: 79 tasks across 7 phases
**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (Unified Visual Language = foundation)

---

## Implementation Strategy

### Delivery Phases

1. **Phase 1**: Setup & Project Structure (5 tasks)
   - Initialize component library folder structure
   - Install/verify dependencies
   - Configure Tailwind for component library

2. **Phase 2**: Foundational Components (15 tasks)
   - Build core components (Button, Input, Card, Badge, Modal, Alert, Table)
   - Unit tests for each component
   - Component index exports

3. **Phase 3**: User Story 1 - Unified Visual Language (20 tasks) 🎯 **MVP**
   - Refactor Layout, Header, Sidebar components
   - Refactor view files to use library components
   - Test consistency across views

4. **Phase 4**: User Story 2 - Modern Color Palette (12 tasks)
   - Apply Indigo + Slate palette to all components
   - Semantic color application (green/yellow/red/blue)
   - Color consistency verification

5. **Phase 5**: User Story 3 - Reusable Component Library (15 tasks)
   - Implement extended components (Spinner, Toast, Breadcrumb, Tabs, etc.)
   - Component documentation
   - Developer integration guide updates

6. **Phase 6**: User Story 4 - Responsive & Accessible Layout (8 tasks)
   - Responsive design implementation (mobile-first)
   - WCAG AA accessibility verification
   - Keyboard navigation testing

7. **Phase 7**: Polish & Quality Assurance (4 tasks)
   - Visual regression testing
   - Cross-browser testing
   - Lighthouse audit
   - Final quality gates

### Parallel Execution Opportunities

- **Phase 2**: All component implementations can run in parallel (different files)
- **Phase 3**: View refactoring can run in parallel (independent views)
- **Phase 5**: Extended components can run in parallel (different files)

### MVP Definition

**Minimum Viable Product = Phase 1 + Phase 2 + Phase 3**

Delivers:
- Unified visual language across core views (Dashboard, Employees, Shifts, Vacations, Reports)
- Reusable component library (core components)
- Professional appearance with consistent styling

---

## Phase 1: Setup & Project Structure ✅ COMPLETE

**Goal**: Initialize component library infrastructure
**Duration**: ~2 hours
**Independent Test**: `frontend/src/components/ui/` folder exists with proper structure, Tailwind configured
**Status**: COMPLETE (2026-02-28 18:25)

### Tasks

- [x] T001 Create frontend/src/components/ui/ folder structure with subfolders for components
- [x] T002 Create frontend/src/components/ui/index.ts for exporting all components
- [x] T003 Create frontend/src/config/designTokens.ts with color palette, spacing, typography constants
- [x] T004 Create frontend/src/styles/globals.css with Tailwind imports and design token CSS variables
- [x] T005 Verify Tailwind CSS v3+ is configured in frontend/tailwind.config.js with correct content paths

**Deliverables**:
- ✅ `frontend/src/components/ui/` folder created and ready for component implementations
- ✅ `frontend/src/components/ui/index.ts` created (will export all components)
- ✅ `frontend/src/config/designTokens.ts` created with complete design system tokens (colors, spacing, typography, shadows, transitions)
- ✅ `frontend/src/index.css` updated with @tailwind directives and base styles using design tokens
- ✅ `frontend/tailwind.config.js` created with Indigo + Slate palette, spacing scale, border radius, shadows
- ✅ `frontend/postcss.config.js` created for PostCSS integration
- ✅ Tailwind CSS v3 installed (`npm install tailwindcss postcss autoprefixer`)
- ✅ CSS tree-shaking configured for optimal bundle size

---

## Phase 2: Foundational Components

**Goal**: Implement core, reusable UI components used by all views
**Duration**: ~8 hours
**Independent Test**: All core components render without errors, unit tests pass, imports work

### Component: Button

- [ ] T006 [P] Implement Button.tsx component in frontend/src/components/ui/Button.tsx (primary, secondary, danger variants; sm/md/lg sizes)
- [ ] T007 [P] Add TypeScript types for ButtonProps in frontend/src/components/ui/Button.tsx
- [ ] T008 [P] Write unit tests for Button component in frontend/tests/components/ui/Button.test.tsx

### Component: Input

- [ ] T009 [P] Implement Input.tsx component in frontend/src/components/ui/Input.tsx (text, email, password, number types with error/help text support)
- [ ] T010 [P] Add TypeScript types for InputProps in frontend/src/components/ui/Input.tsx
- [ ] T011 [P] Write unit tests for Input component in frontend/tests/components/ui/Input.test.tsx

### Component: Card

- [ ] T012 [P] Implement Card.tsx component in frontend/src/components/ui/Card.tsx (container with padding, border, shadow)
- [ ] T013 [P] Add TypeScript types for CardProps in frontend/src/components/ui/Card.tsx
- [ ] T014 [P] Write unit tests for Card component in frontend/tests/components/ui/Card.test.tsx

### Component: Badge

- [ ] T015 [P] Implement Badge.tsx component in frontend/src/components/ui/Badge.tsx (success/warning/error/info/neutral variants)
- [ ] T016 [P] Add TypeScript types for BadgeProps in frontend/src/components/ui/Badge.tsx
- [ ] T017 [P] Write unit tests for Badge component in frontend/tests/components/ui/Badge.test.tsx

### Component: Alert

- [ ] T018 [P] Implement Alert.tsx component in frontend/src/components/ui/Alert.tsx (info/success/warning/error variants with icons)
- [ ] T019 [P] Add TypeScript types for AlertProps in frontend/src/components/ui/Alert.tsx
- [ ] T020 [P] Write unit tests for Alert component in frontend/tests/components/ui/Alert.test.tsx

### Component: Modal

- [ ] T021 [P] Implement Modal.tsx component in frontend/src/components/ui/Modal.tsx (dialog with header, body, footer; with focus trap)
- [ ] T022 [P] Add TypeScript types for ModalProps in frontend/src/components/ui/Modal.tsx
- [ ] T023 [P] Write unit tests for Modal component in frontend/tests/components/ui/Modal.test.tsx

### Component: Table

- [ ] T024 [P] Implement Table.tsx component in frontend/src/components/ui/Table.tsx (table, thead, tbody, tfoot with alternating row colors)
- [ ] T025 [P] Add TypeScript types for TableProps in frontend/src/components/ui/Table.tsx
- [ ] T026 [P] Write unit tests for Table component in frontend/tests/components/ui/Table.test.tsx

### Index & Exports

- [ ] T027 Update frontend/src/components/ui/index.ts to export all core components (Button, Input, Card, Badge, Alert, Modal, Table)
- [ ] T028 Verify all components are importable via `import { Button, Input, ... } from '@/components/ui'`

---

## Phase 3: User Story 1 - Unified Visual Language

**Goal**: Achieve consistent visual styling across all views using library components
**Duration**: ~10 hours
**Independent Test**: All views use library components; no inline custom styles; visual consistency verified across Dashboard, Employees, Shifts, Vacations, Reports
**Acceptance Criteria**:
- All buttons in all views use Button component (primary, secondary, danger variants only)
- All form inputs use Input component (no custom input styling)
- All cards use Card component (no custom card styling)
- Navigation header/sidebar use Button and Card components
- All views render without TypeScript errors

### Layout Components Refactoring

- [ ] T029 [US1] Refactor frontend/src/components/Layout.tsx to use Button, Card components instead of inline styles
- [ ] T030 [US1] Refactor frontend/src/components/Header.tsx to use Button component for navigation items
- [ ] T031 [US1] Refactor frontend/src/components/Sidebar.tsx to use Button, Card components for menu structure

### View Refactoring - Part 1

- [ ] T032 [P] [US1] Refactor frontend/src/views/LoginView.tsx to use Button, Input, Card components
- [ ] T033 [P] [US1] Refactor frontend/src/views/DashboardView.tsx to use Button, Card, Badge components
- [ ] T034 [P] [US1] Refactor frontend/src/views/EmployeeListView.tsx to use Button, Input, Card, Table, Badge components
- [ ] T035 [P] [US1] Refactor frontend/src/views/ShiftView.tsx to use Button, Input, Card, Table components
- [ ] T036 [P] [US1] Refactor frontend/src/views/VacationView.tsx to use Button, Input, Card, Table, Badge components

### View Refactoring - Part 2

- [ ] T037 [P] [US1] Refactor frontend/src/views/ReportsView.tsx to use Button, Card, Table, Badge components
- [ ] T038 [P] [US1] Refactor frontend/src/views/SettingsView.tsx to use Button, Input, Card components
- [ ] T039 [P] [US1] Refactor frontend/src/views/ProfileView.tsx to use Button, Input, Card components

### Verification & Testing

- [ ] T040 [US1] Run `tsc --noEmit` to verify TypeScript strict mode (no errors)
- [ ] T041 [US1] Run `npm run lint` to verify ESLint passes (no custom style violations)
- [ ] T042 [US1] Manually verify visual consistency: navigate between Dashboard → Employees → Shifts → Vacations → Reports; confirm no visual jarring
- [ ] T043 [US1] Remove old custom CSS files that are now obsolete (frontend/src/styles/*.css except globals.css)
- [ ] T044 [US1] Update frontend/README.md to document component usage (reference quickstart.md)
- [ ] T045 [US1] Commit: "refactor: migrate all views to use UI component library (US1)"

---

## Phase 4: User Story 2 - Modern Color Palette

**Goal**: Apply Indigo + Slate color palette and semantic colors consistently
**Duration**: ~6 hours
**Independent Test**: All views use only Indigo-600 (primary), Slate scale (neutrals), semantic colors (green/yellow/red/blue); zero custom colors
**Acceptance Criteria**:
- Button primary actions: Indigo-600 text on white OR white text on Indigo-600
- Button secondary actions: Slate-100 bg, Slate-700 text
- All text: Slate-700 (body), Slate-900 (headings), Slate-500 (secondary)
- All backgrounds: White or Slate-50 (cards), Slate-100 (light sections)
- Semantic colors: Green-600 (success), Yellow-600 (warning), Red-600 (error), Blue-600 (info)
- Borders: Slate-200
- Hover states use +1 shade darker/lighter

### Color System Implementation

- [ ] T046 [US2] Update frontend/src/config/designTokens.ts with complete Indigo + Slate palette and semantic colors
- [ ] T047 [US2] Update frontend/src/styles/globals.css with CSS variables for all colors (--color-primary, --color-slate-*, etc.)
- [ ] T048 [US2] Verify Button.tsx uses correct colors: primary Indigo-600, secondary Slate-100, danger Red-600
- [ ] T049 [US2] Verify Input.tsx uses correct colors: border Slate-200, focus outline Indigo-600
- [ ] T050 [US2] Verify Card.tsx uses correct background: white or Slate-50
- [ ] T051 [US2] Verify Badge.tsx uses semantic colors: green/yellow/red/blue per variant

### Validation & Verification

- [ ] T052 [US2] Run visual color audit: open each view (Dashboard, Employees, Shifts, Vacations, Reports) and verify:
  - Only Indigo-600, Slate shades, semantic colors visible
  - No green/teal/blue/pink/orange other than semantic colors
  - Consistent color usage across same component types
- [ ] T053 [US2] Verify color contrast: use Lighthouse or WebAIM checker to confirm 4.5:1 ratio for all text
- [ ] T054 [US2] Test semantic color usage: confirm error messages use Red-600, success uses Green-600, warnings use Yellow-600, info uses Blue-600
- [ ] T055 [US2] Commit: "feat: apply Indigo + Slate color palette across UI (US2)"

---

## Phase 5: User Story 3 - Reusable Component Library

**Goal**: Extend component library with additional reusable components for complex UI patterns
**Duration**: ~8 hours
**Independent Test**: All extended components implement correctly; available for import; used in views
**Acceptance Criteria**:
- 15-20 total components available (core 7 + extended 8-13)
- Each component has TypeScript types, unit tests
- Components documented in `specs/003-ui-redesign/contracts/`

### Extended Components - Part 1

- [ ] T056 [P] [US3] Implement Spinner.tsx component in frontend/src/components/ui/Spinner.tsx (loading indicator with animation)
- [ ] T057 [P] [US3] Add unit tests for Spinner in frontend/tests/components/ui/Spinner.test.tsx
- [ ] T058 [P] [US3] Implement Toast.tsx component in frontend/src/components/ui/Toast.tsx (notification system, auto-dismiss)
- [ ] T059 [P] [US3] Add unit tests for Toast in frontend/tests/components/ui/Toast.test.tsx

### Extended Components - Part 2

- [ ] T060 [P] [US3] Implement Breadcrumb.tsx component in frontend/src/components/ui/Breadcrumb.tsx (navigation path)
- [ ] T061 [P] [US3] Add unit tests for Breadcrumb in frontend/tests/components/ui/Breadcrumb.test.tsx
- [ ] T062 [P] [US3] Implement Tabs.tsx component in frontend/src/components/ui/Tabs.tsx (tab navigation interface)
- [ ] T063 [P] [US3] Add unit tests for Tabs in frontend/tests/components/ui/Tabs.test.tsx

### Extended Components - Part 3

- [ ] T064 [P] [US3] Implement Dropdown.tsx component in frontend/src/components/ui/Dropdown.tsx (menu, select dropdown)
- [ ] T065 [P] [US3] Add unit tests for Dropdown in frontend/tests/components/ui/Dropdown.test.tsx
- [ ] T066 [P] [US3] Implement Checkbox.tsx component in frontend/src/components/ui/Checkbox.tsx (checkbox input)
- [ ] T067 [P] [US3] Add unit tests for Checkbox in frontend/tests/components/ui/Checkbox.test.tsx

### Extended Components - Part 4

- [ ] T068 [P] [US3] Implement Radio.tsx component in frontend/src/components/ui/Radio.tsx (radio button group)
- [ ] T069 [P] [US3] Add unit tests for Radio in frontend/tests/components/ui/Radio.test.tsx
- [ ] T070 [P] [US3] Implement Pagination.tsx component in frontend/src/components/ui/Pagination.tsx (pagination controls)
- [ ] T071 [P] [US3] Add unit tests for Pagination in frontend/tests/components/ui/Pagination.test.tsx

### Documentation & Integration

- [ ] T072 [US3] Update frontend/src/components/ui/index.ts to export all extended components
- [ ] T073 [US3] Create component contract specs for extended components in specs/003-ui-redesign/contracts/ (e.g., spinner.md, toast.md, etc.)
- [ ] T074 [US3] Update specs/003-ui-redesign/quickstart.md with examples for extended components
- [ ] T075 [US3] Commit: "feat: implement extended component library (Spinner, Toast, Breadcrumb, Tabs, Dropdown, Checkbox, Radio, Pagination) (US3)"

---

## Phase 6: User Story 4 - Responsive & Accessible Layout

**Goal**: Ensure all views are responsive and WCAG AA accessible
**Duration**: ~6 hours
**Independent Test**: Mobile (375px), tablet (768px), desktop (1280px) layouts render correctly; keyboard navigation works; Lighthouse accessibility ≥90
**Acceptance Criteria**:
- No horizontal scrolling on viewport < 1024px
- All interactive elements tab-reachable
- Focus indicators visible (2px outline Indigo-600)
- Color contrast ≥4.5:1 for normal text
- ARIA labels on all dynamic content
- Modals have focus trap, escape closes

### Responsive Design Implementation

- [ ] T076 [US4] Audit frontend/src/views/ for responsive classes (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- [ ] T077 [US4] Update Dashboard view: grid layout responsive, cards stack on mobile (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- [ ] T078 [US4] Update Employees, Shifts, Vacations views: table responsive on tablet+, list view on mobile
- [ ] T079 [US4] Test responsive breakpoints: verify layout correct at 375px, 768px, 1280px in browser DevTools

### Accessibility Implementation

- [ ] T080 [US4] Add ARIA labels to all icon-only buttons (e.g., close, delete, edit buttons)
- [ ] T081 [US4] Add focus trap to Modal component (Tab loops within modal until escape)
- [ ] T082 [US4] Verify all form inputs have associated labels (<label htmlFor="id">)
- [ ] T083 [US4] Verify all error messages have aria-describedby linking to input

### Verification & Testing

- [ ] T084 [US4] Run Lighthouse accessibility audit: `npm run build && lighthouse http://localhost:5173` (target score ≥90)
- [ ] T085 [US4] Keyboard-only navigation test: navigate entire app using only Tab, Enter, Space, Escape keys
- [ ] T086 [US4] Color contrast test: use WebAIM or Lighthouse to verify 4.5:1 ratio on all text
- [ ] T087 [US4] Commit: "feat: implement responsive and accessible layout (US4)"

---

## Phase 7: Polish & Quality Assurance

**Goal**: Final quality gates, visual regression testing, cross-browser compatibility
**Duration**: ~4 hours
**Independent Test**: All views pass Lighthouse audit, visual regressions tested, bundle size verified
**Acceptance Criteria**:
- Lighthouse accessibility ≥90, performance ≥85, best practices ≥95
- Bundle size increase ≤20KB
- No visual regressions across Chrome, Safari, Firefox

### Quality Verification

- [ ] T088 Run full test suite: `npm run test` (all component tests pass)
- [ ] T089 Run type check: `tsc --noEmit` (no TypeScript errors)
- [ ] T090 Run linter: `npm run lint` (ESLint passes)
- [ ] T091 Run Lighthouse audit on all main views (Dashboard, Employees, Shifts, Vacations, Reports); verify accessibility ≥90, performance ≥85

### Bundle Size & Performance

- [ ] T092 Check bundle size: `npm run build` and verify:
  - Total frontend bundle size increase ≤20KB
  - No new dependencies added beyond Tailwind + Lucide (already in stack)
  - CSS properly tree-shaken (no unused Tailwind classes)

### Cross-Browser Testing

- [ ] T093 Visual regression test on Chrome (latest): navigate all views, take screenshots, compare against design reference
- [ ] T094 Visual regression test on Safari (latest): verify layouts, colors, typography consistent
- [ ] T095 Visual regression test on Firefox (latest): verify focus indicators, form inputs, interactions work

### Final Verification

- [ ] T096 Git status check: `git status` (all changes committed)
- [ ] T097 Create final commit: `git commit -m "feat: complete UI redesign with consistent design system (003-ui-redesign)"`
- [ ] T098 Create merge commit to main: `git checkout main && git merge 003-ui-redesign`

---

## Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundational Components)
                    ↓
                Phase 3 (Unified Visual Language) → MVP Complete
                    ↓
                Phase 4 (Color Palette)
                    ↓
                Phase 5 (Extended Components)
                    ↓
                Phase 6 (Responsive & Accessible)
                    ↓
                Phase 7 (Polish & QA)
```

### Phase 3 Dependencies (Unified Visual Language)
- Depends on: Phase 1, Phase 2
- Parallel tasks: T032-T039 (view refactoring), T029-T031 (layout refactoring)
- Must complete before: Phase 4, Phase 5, Phase 6

### Phase 4 Dependencies (Color Palette)
- Depends on: Phase 3
- Can run in parallel with Phase 5
- Parallel tasks: T046-T054 (color implementation)

### Phase 5 Dependencies (Extended Components)
- Depends on: Phase 2
- Can run in parallel with Phase 4, Phase 6
- Parallel tasks: T056-T074 (component implementation)

### Phase 6 Dependencies (Responsive & Accessible)
- Depends on: Phase 3
- Can run in parallel with Phase 5
- Parallel tasks: T076-T087 (responsive + accessibility)

---

## Success Metrics

### Phase 3 (MVP)
- ✅ All views refactored to use library components
- ✅ Zero TypeScript errors (`tsc --noEmit` passes)
- ✅ Zero ESLint violations (`npm run lint` passes)
- ✅ All unit tests pass (`npm run test` passes)

### Phase 4
- ✅ All views use only Indigo + Slate + semantic colors
- ✅ Color contrast ≥4.5:1 on all text
- ✅ Visual consistency verified across views

### Phase 5
- ✅ 15-20 components available in library
- ✅ All components have TypeScript types and tests
- ✅ Component documentation complete

### Phase 6
- ✅ Responsive layout works at 375px, 768px, 1280px
- ✅ Keyboard-only navigation works
- ✅ Lighthouse accessibility ≥90

### Phase 7
- ✅ Bundle size increase ≤20KB
- ✅ All Lighthouse audits ≥85 (performance), ≥90 (accessibility), ≥95 (best practices)
- ✅ Cross-browser visual regression tested (Chrome, Safari, Firefox)

---

## Rollback Plan

If critical issues arise:
1. Revert to previous commit: `git revert HEAD`
2. Stay on 003-ui-redesign branch for debugging
3. Fix issues and re-commit
4. Merge to main only after all Phase 7 checks pass

---

## Notes

- **No Backend Changes**: All changes are frontend UI only. Backend API, database, business logic unchanged.
- **No New Dependencies**: Uses existing React 19, TypeScript, Tailwind CSS, Lucide React, Vitest.
- **Backward Compatible**: All existing functionality preserved. This is UI refactoring only.
- **Mobile First**: All responsive classes use Tailwind mobile-first approach (base classes for mobile, md: and lg: for larger screens).
- **Spanish Language**: All UI text remains in Spanish (es-ES). No localization changes.
