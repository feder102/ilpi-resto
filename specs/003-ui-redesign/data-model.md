# Design System: UI Redesign & Consistency

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Date**: 2026-02-28
**Reference**: `C:\Users\Fede\ILPI\diseño`

---

## Design System Overview

A cohesive visual language for the ILPI Kitchen Staff Management System. Built on **Tailwind CSS** for consistency, accessibility, and performance.

---

## Color Palette

### Primary Colors

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| **Indigo-600** | `#4F46E5` | `bg-indigo-600` | Primary actions, links, highlights, focus states |
| **Indigo-500** | `#6366F1` | `bg-indigo-500` | Hover state on primary actions |
| **Indigo-700** | `#4338CA` | `bg-indigo-700` | Active state on primary actions |

### Neutral Colors (Slate Scale)

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| **Slate-50** | `#F8FAFC` | `bg-slate-50` | Page background |
| **Slate-100** | `#F1F5F9` | `bg-slate-100` | Card backgrounds, light sections |
| **Slate-200** | `#E2E8F0` | `border-slate-200` | Borders, dividers |
| **Slate-500** | `#64748B` | `text-slate-500` | Secondary text, placeholders |
| **Slate-700** | `#334155` | `text-slate-700` | Body text |
| **Slate-900** | `#0F172A` | `text-slate-900` | Headings, emphasis |

### Semantic Colors

| State | Color | Tailwind | Usage |
|-------|-------|----------|-------|
| **Success** | Green-600 (`#16A34A`) | `bg-green-600` | Approved, active, confirmed |
| **Warning** | Yellow-600 (`#CA8A04`) | `bg-yellow-600` | Pending, attention required |
| **Error** | Red-600 (`#DC2626`) | `bg-red-600` | Rejected, errors, invalid |
| **Info** | Blue-600 (`#2563EB`) | `bg-blue-600` | Informational messages |

---

## Typography System

### Font Stack

```css
/* Body & UI (sans-serif) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Code blocks (monospace) */
font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
```

### Text Styles

| Component | Size | Weight | Line Height | Color | Tailwind |
|-----------|------|--------|-------------|-------|----------|
| **Heading 1** | 32px | Bold (700) | 1.2 | Slate-900 | `text-4xl font-bold text-slate-900` |
| **Heading 2** | 28px | Bold (700) | 1.2 | Slate-900 | `text-3xl font-bold text-slate-900` |
| **Heading 3** | 24px | Bold (700) | 1.3 | Slate-900 | `text-2xl font-bold text-slate-900` |
| **Body Large** | 18px | Regular (400) | 1.5 | Slate-700 | `text-lg text-slate-700` |
| **Body** | 16px | Regular (400) | 1.5 | Slate-700 | `text-base text-slate-700` |
| **Body Small** | 14px | Regular (400) | 1.5 | Slate-700 | `text-sm text-slate-700` |
| **Label** | 14px | Medium (500) | 1.5 | Slate-700 | `text-sm font-medium text-slate-700` |
| **Caption** | 12px | Regular (400) | 1.4 | Slate-500 | `text-xs text-slate-500` |

---

## Spacing System

Based on 4px unit (Tailwind default).

| Spacing | Pixels | Tailwind | Common Usage |
|---------|--------|----------|--------------|
| **xs** | 4px | `p-1` | Minimal spacing |
| **sm** | 8px | `p-2` | Small gaps |
| **md** | 16px | `p-4` | Default padding/margin |
| **lg** | 24px | `p-6` | Large sections |
| **xl** | 32px | `p-8` | Major sections |
| **2xl** | 48px | `p-12` | Page-level spacing |

### Layout Spacing Rules

- **Card padding**: 16px (`p-4`) interior spacing
- **Form field margin**: 16px (`mb-4`) between fields
- **Section gap**: 24px (`gap-6`) between major content blocks
- **List item spacing**: 8px (`space-y-2`) between list items

---

## Shadow System

| Name | CSS | Tailwind | Usage |
|------|-----|----------|-------|
| **None** | None | `shadow-none` | Flat, no elevation |
| **Small** | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | Input fields, small cards |
| **Medium** | `0 4px 6px rgba(0,0,0,0.1)` | `shadow-md` | Modals, dropdowns, raised cards |
| **Large** | `0 10px 15px rgba(0,0,0,0.1)` | `shadow-lg` | Overlays, high elevation |

---

## Border System

### Border Styles

| Style | Thickness | Color | Tailwind | Usage |
|-------|-----------|-------|----------|-------|
| **Default** | 1px | Slate-200 | `border border-slate-200` | Cards, inputs, containers |
| **Light** | 1px | Slate-100 | `border border-slate-100` | Subtle dividers |
| **Dark** | 1px | Slate-300 | `border border-slate-300` | Strong emphasis |
| **None** | 0px | — | `border-0` | Borderless elements |

### Border Radius

| Radius | Size | Tailwind | Usage |
|--------|------|----------|-------|
| **Small** | 2px | `rounded-sm` | Input fields, small components |
| **Medium** | 6px | `rounded-md` | Buttons, cards, form elements |
| **Large** | 8px | `rounded-lg` | Modals, major containers |
| **Full** | 50% | `rounded-full` | Badges, avatars, circular elements |

---

## Component Specifications

### States: Interactive Elements

All interactive components must support these states:

| State | Appearance | When Triggered |
|-------|-----------|-----------------|
| **Default** | Normal styling | Initial render |
| **Hover** | Slightly darker/lighter shade | Mouse over |
| **Active/Focus** | Indigo highlight, visible outline | Clicked or keyboard focused |
| **Disabled** | Grayed out, no interaction | Disabled by component prop |
| **Loading** | Spinner/skeleton, prevented interaction | Data fetch in progress |

### Focus Indicators

All focusable elements must have **visible focus indicator**:
```css
outline: 2px solid #4F46E5 (Indigo-600);
outline-offset: 2px;
```

Tailwind utility: `focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600`

---

## Component Library

### Core Components (Priority 1)

#### 1. Button

**Variants**: Primary, Secondary, Danger
**Sizes**: Small (sm), Medium (md), Large (lg)
**States**: Default, Hover, Active, Disabled, Loading

**Default Styling**:
```
Primary Button:
- Background: Indigo-600
- Text: White
- Padding: 8px 16px (md)
- Border Radius: 6px
- Font Weight: 500

Secondary Button:
- Background: Slate-100
- Text: Slate-700
- Padding: 8px 16px (md)
- Border: 1px Slate-200
- Font Weight: 500

Danger Button:
- Background: Red-600
- Text: White
- Padding: 8px 16px (md)
- Font Weight: 500
```

#### 2. Input

**Variants**: Text, Email, Password, Number, Search
**States**: Default, Focused, Filled, Error, Disabled, Loading

**Default Styling**:
```
- Background: White
- Border: 1px Slate-200
- Border Radius: 6px
- Padding: 8px 12px
- Font Size: 16px
- Focus Border: Indigo-600
- Focus Shadow: 0 0 0 3px rgba(79, 70, 229, 0.1)
```

#### 3. Card

**Usage**: Container for grouped content

**Default Styling**:
```
- Background: White or Slate-50
- Border: 1px Slate-200
- Border Radius: 8px
- Padding: 16px
- Shadow: shadow-sm
```

#### 4. Alert

**Variants**: Info, Success, Warning, Error

**Styling**:
```
Info:
- Background: Blue-50
- Border Left: 4px Blue-600
- Icon: Info icon (Lucide)

Success:
- Background: Green-50
- Border Left: 4px Green-600
- Icon: Check icon

Warning:
- Background: Yellow-50
- Border Left: 4px Yellow-600
- Icon: Alert icon

Error:
- Background: Red-50
- Border Left: 4px Red-600
- Icon: X icon
```

#### 5. Badge

**Variants**: Success, Warning, Error, Info, Neutral

**Default Styling**:
```
- Padding: 4px 8px
- Border Radius: 12px (full)
- Font Size: 12px (text-xs)
- Font Weight: 500

Success: Green-100 bg, Green-700 text
Warning: Yellow-100 bg, Yellow-700 text
Error: Red-100 bg, Red-700 text
Info: Blue-100 bg, Blue-700 text
Neutral: Slate-100 bg, Slate-700 text
```

#### 6. Modal

**Structure**: Overlay + Dialog + Header + Body + Footer

**Default Styling**:
```
- Overlay: Black 40% opacity
- Dialog: White, 500px max-width, shadow-lg
- Border Radius: 8px
- Header Padding: 20px
- Body Padding: 20px
- Footer Padding: 16px, border-top
- Close Button: Top-right, Slate-400
```

#### 7. Table

**Features**: Headers, Rows, Alternating row colors, Pagination

**Default Styling**:
```
- Header Background: Slate-50
- Header Font: Bold, Slate-900
- Row Borders: 1px Slate-200
- Alternate Rows: Slate-50 bg for even rows
- Padding: 12px per cell
- Text Alignment: Left (default)
```

### Extended Components (Priority 2)

- **Spinner**: Loading indicator (Lucide `Loader2` icon, spinning animation)
- **Toast**: Toast notification (Position: bottom-right, auto-dismiss after 4s)
- **Breadcrumb**: Navigation path (Slate-500 separators, Indigo link color)
- **Tabs**: Tab navigation (Indigo underline on active tab)
- **Dropdown**: Menu items (Slate-100 hover, Indigo on selection)
- **Checkbox**: Checkbox input (Indigo-600 when checked)
- **Radio**: Radio button group (Indigo-600 when selected)
- **Select**: Dropdown select (Similar to Input styling)
- **Textarea**: Multi-line text (Similar to Input styling)
- **Form**: Form wrapper (Consistent spacing between fields, group-related inputs)
- **Label**: Form label (Slate-700, font-medium)
- **Pagination**: Pagination controls (Indigo active page, Slate-200 borders)
- **Empty State**: No data display (Icon + message, Slate-400 text)

---

## Responsive Breakpoints

Using Tailwind defaults:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| **Mobile** | <640px | Single column layout, stacked components |
| **Tablet** | 640px–768px | Two-column layout, adjusted card sizes |
| **Desktop** | 768px–1024px | Three-column layout, full features |
| **Large Desktop** | 1280px+ | Full-width layouts, maximum information density |

### Mobile-First Approach

All base styles target mobile (375px). Breakpoints progressively enhance for larger screens.

Example:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

---

## Accessibility Requirements

### WCAG AA Compliance

- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus Indicator**: Visible on all focusable elements
- **Keyboard Navigation**: All components operable via Tab, Enter, Space, Escape
- **ARIA Labels**: Form inputs, buttons, modals properly labeled
- **Text Alternatives**: Icons include aria-labels or adjacent text

### Implementation Checklist

- [ ] Color contrast verified (Lighthouse ≥90)
- [ ] Keyboard navigation tested (Tab through all elements)
- [ ] ARIA labels added to dynamic content
- [ ] Focus outlines visible (2px Indigo-600)
- [ ] Error messages associated with form fields
- [ ] Loading states announced (`aria-busy="true"`)
- [ ] Modals have proper focus trap and `role="dialog"`

---

## Usage Examples

### Button

```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md">Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" disabled>Delete</Button>
```

### Card

```tsx
import { Card } from '@/components/ui/Card';

<Card>
  <h3 className="font-bold text-slate-900">Title</h3>
  <p className="text-slate-700">Content goes here</p>
</Card>
```

### Alert

```tsx
import { Alert } from '@/components/ui/Alert';

<Alert variant="success">Operation completed successfully!</Alert>
<Alert variant="error">An error occurred. Please try again.</Alert>
```

---

## Quality Assurance

### Visual Testing Checklist

- [ ] All colors match design specification
- [ ] Typography sizes and weights correct
- [ ] Spacing consistent throughout
- [ ] Border radius applied correctly
- [ ] Shadows at correct elevation
- [ ] Responsive layout works on 3+ breakpoints
- [ ] Dark mode support (if applicable)

### Accessibility Testing

- [ ] Lighthouse audit score ≥90
- [ ] Keyboard-only navigation works
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

### Browser Compatibility

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Future Enhancements

Post-MVP design system improvements:
- Dark mode theme
- RTL language support
- Animation/transition library
- Custom Tailwind configuration (CSS variables for tokens)
- Figma design kit export
