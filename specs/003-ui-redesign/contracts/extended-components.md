# Extended Component Library Contracts

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Date**: 2026-02-28
**Components**: Spinner, Toast, Breadcrumb, Tabs, Dropdown, Checkbox, Radio, Pagination

---

## Component Contracts

### 1. Spinner

**Purpose**: Loading indicator with smooth rotation animation

**Props**:
```typescript
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';      // default: 'md'
  color?: 'indigo' | 'slate' | 'white'; // default: 'indigo'
  label?: string;                 // Optional label text below spinner
}
```

**States**:
- Rotating animation with 2 nested circles
- Color variants: Indigo-600, Slate-600, White
- Size variants: 16px (sm), 32px (md), 48px (lg)

**Accessibility**:
- ARIA role: None (visual loading indicator)
- Optional label below spinner for context

**Example**:
```tsx
<Spinner size="md" color="indigo" label="Loading..." />
```

---

### 2. Toast

**Purpose**: Non-blocking notification that auto-dismisses

**Props**:
```typescript
interface ToastProps {
  message: string;
  variant?: 'success' | 'warning' | 'error' | 'info'; // default: 'info'
  duration?: number;              // ms before auto-dismiss, default: 5000, 0 to disable
  onDismiss?: () => void;
  title?: string;                 // Optional title
}
```

**States**:
- Auto-dismiss after duration (default 5000ms)
- Semantic colors: Green (success), Yellow (warning), Red (error), Blue (info)
- Left 4px colored border

**Accessibility**:
- role="status" aria-live="polite"
- Optional close button
- Shows both title (if provided) and message

**Example**:
```tsx
<Toast
  message="Operation completed"
  variant="success"
  duration={3000}
  onDismiss={handleDismiss}
/>
```

---

### 3. Breadcrumb

**Purpose**: Navigation path showing user's current location in hierarchy

**Props**:
```typescript
interface BreadcrumbProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    label: string;
    href?: string;
    current?: boolean;
  }[];
  onNavigate?: (href: string, label: string) => void;
}
```

**States**:
- Non-current items: Indigo-600 clickable links
- Current item: Plain text with aria-current="page"
- Separator: ChevronRight icon (Slate-400)

**Accessibility**:
- role="navigation" aria-label="Breadcrumb"
- aria-current="page" on current item
- Focus indicator on links

**Example**:
```tsx
<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Employees', href: '/employees' },
    { label: 'John Doe', current: true }
  ]}
  onNavigate={(href) => navigate(href)}
/>
```

---

### 4. Tabs

**Purpose**: Tab navigation interface for organizing content

**Props**:
```typescript
interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: {
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}
```

**States**:
- Active tab: Indigo-600 bottom border, Indigo-600 text
- Inactive tab: Transparent border, Slate-600 text
- Disabled tab: Reduced opacity, no interaction

**Accessibility**:
- role="tab" on tab buttons
- aria-selected="true/false"
- aria-disabled on disabled tabs
- Keyboard navigation supported

**Example**:
```tsx
<Tabs
  items={[
    { id: 'details', label: 'Details', content: <DetailsView /> },
    { id: 'settings', label: 'Settings', content: <SettingsView /> }
  ]}
  defaultTab="details"
  onChange={(id) => console.log(id)}
/>
```

---

### 5. Dropdown

**Purpose**: Select menu for choosing from list of options

**Props**:
```typescript
interface DropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: {
    value: string;
    label: string;
    disabled?: boolean;
  }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;           // default: "Select an option"
  disabled?: boolean;
}
```

**States**:
- Closed: Button shows selected value or placeholder
- Open: Menu displays all options
- Hover: Indigo-50 background on options
- Selected: Indigo-100 background, Indigo-700 text
- ChevronDown icon rotates when open

**Accessibility**:
- role="listbox" on menu
- role="option" on menu items
- aria-haspopup="listbox"
- aria-expanded="true/false"
- Click-outside to close

**Example**:
```tsx
<Dropdown
  options={[
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' }
  ]}
  value={selected}
  onChange={setSelected}
  placeholder="Select shift"
/>
```

---

### 6. Checkbox

**Purpose**: Checkbox input with label and validation support

**Props**:
```typescript
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  indeterminate?: boolean;
}
```

**States**:
- Unchecked: Slate-300 border
- Checked: Indigo-600 background, Indigo-600 border with Check icon
- Indeterminate: Indigo-600 background (minus sign visual)
- Disabled: Opacity-50, no interaction

**Accessibility**:
- Focus ring: 2px Indigo-600
- Associated label with htmlFor
- Error and helper text support

**Example**:
```tsx
<Checkbox
  id="agree"
  label="I agree to terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
  error={error}
/>
```

---

### 7. Radio (RadioGroup)

**Purpose**: Radio button group for selecting one option from multiple

**Props**:
```typescript
interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: {
    value: string;
    label: string;
    disabled?: boolean;
  }[];
  value?: string;
  onChange?: (value: string) => void;
  legend?: string;
  orientation?: 'vertical' | 'horizontal'; // default: 'vertical'
  error?: string;
  disabled?: boolean;
}
```

**States**:
- Unselected: Slate-300 border
- Selected: Indigo-600 background, Indigo-600 border with dot inside
- Disabled option: Opacity-50, no interaction
- Horizontal layout: flex with gap-6

**Accessibility**:
- fieldset with legend
- Focus ring: 2px Indigo-600
- Associated labels with htmlFor

**Example**:
```tsx
<RadioGroup
  legend="Select shift type"
  options={[
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'night', label: 'Night' }
  ]}
  value={shift}
  onChange={setShift}
/>
```

---

### 8. Pagination

**Purpose**: Navigation controls for large datasets with multiple pages

**Props**:
```typescript
interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;            // default: 2 (pages shown on each side)
  showArrows?: boolean;             // default: true (prev/next buttons)
  showEdges?: boolean;              // default: false (first/last buttons)
  disabled?: boolean;
}
```

**States**:
- Current page: Indigo-600 background, white text, aria-current="page"
- Other pages: Slate-200 border, Slate-700 text
- Arrows: Disabled on first/last pages
- Ellipsis: Shows "..." when pages are skipped

**Accessibility**:
- aria-label on arrow buttons
- aria-current="page" on current page button
- Focus indicators on all buttons
- Keyboard navigation supported

**Example**:
```tsx
<Pagination
  currentPage={page}
  totalPages={10}
  onPageChange={setPage}
  siblingCount={2}
  showArrows={true}
  showEdges={false}
/>
```

---

## Color Palette Usage

All extended components follow the design system:

| Element | Color | Tailwind |
|---------|-------|----------|
| Primary interaction | Indigo-600 | `bg-indigo-600` |
| Hover states | Indigo-50 | `hover:bg-indigo-50` |
| Selected state | Indigo-100 | `bg-indigo-100` |
| Borders | Slate-200 | `border-slate-200` |
| Text | Slate-700 | `text-slate-700` |
| Disabled | Slate-400 | `text-slate-400 opacity-50` |
| Focus ring | Indigo-600 | `focus:ring-2 focus:ring-indigo-600` |

---

## Responsive Design

All extended components are mobile-first:
- Base styles: Mobile layout
- `md:` classes: Tablet and up (≥768px)
- `lg:` classes: Desktop and up (≥1024px)
- `xl:` classes: Large desktop (≥1280px)

---

## Accessibility Requirements

All components meet WCAG AA standards:
- ✅ 4.5:1 color contrast on all text
- ✅ Keyboard navigation support (Tab, Enter, Space, Escape)
- ✅ Focus indicators visible (2px outline)
- ✅ ARIA labels and roles
- ✅ Screen reader announcements for dynamic content
- ✅ No color-only communication (use icons + text)

---

## Testing Checklist

For each extended component:
- [ ] Component renders without errors
- [ ] All props work correctly
- [ ] States (hover, active, disabled) display correctly
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast ≥4.5:1
- [ ] Unit tests pass
- [ ] No console errors or warnings

---

## Usage Import Patterns

```tsx
// Individual imports
import { Spinner, Toast, Breadcrumb, Tabs } from '@/components/ui';

// Or with fully qualified names
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Tabs from '@/components/ui/Tabs';
import Dropdown from '@/components/ui/Dropdown';
import Checkbox from '@/components/ui/Checkbox';
import RadioGroup from '@/components/ui/Radio';
import Pagination from '@/components/ui/Pagination';
```

---

## Performance Notes

- Components use React.forwardRef for ref forwarding
- Memoization where appropriate to prevent unnecessary re-renders
- Event handlers properly typed with useCallback where needed
- No performance regressions in bundle size (<20KB increase)

