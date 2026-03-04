# Developer Quickstart: UI Component Library

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Date**: 2026-02-28

Quick reference for developers integrating the new component library into views.

---

## Installation & Setup

### 1. Component Library Location

All reusable components live in:
```
frontend/src/components/ui/
├── Button.tsx
├── Input.tsx
├── Card.tsx
├── Badge.tsx
├── Modal.tsx
├── Alert.tsx
├── Table.tsx
├── Spinner.tsx
├── Toast.tsx
├── Breadcrumb.tsx
├── Tabs.tsx
├── Dropdown.tsx
├── Checkbox.tsx
├── Radio.tsx
├── Select.tsx
├── Textarea.tsx
├── Form.tsx
├── Label.tsx
├── Pagination.tsx
├── EmptyState.tsx
└── index.ts (exports all)
```

### 2. Import Components

```tsx
// Individual import
import { Button } from '@/components/ui/Button';

// Bulk import (from index.ts)
import { Button, Card, Alert, Badge } from '@/components/ui';

// In a view
import React from 'react';
import { Button, Card, Input, Alert } from '@/components/ui';

export function MyView() {
  return (
    <div className="p-6">
      <Card>
        <h1 className="text-2xl font-bold">Title</h1>
        <Button variant="primary">Click Me</Button>
      </Card>
    </div>
  );
}
```

### 3. Design Tokens

Design system tokens (colors, spacing, typography) are available via Tailwind CSS utilities. No additional imports needed.

```tsx
// Color examples
<div className="bg-indigo-600">Primary background</div>
<div className="text-slate-700">Body text</div>
<div className="border border-slate-200">Border</div>

// Spacing examples
<div className="p-4 m-6 gap-2">Padding, margin, gap</div>

// Typography examples
<h1 className="text-4xl font-bold">Heading 1</h1>
<p className="text-base text-slate-700">Body paragraph</p>

// Responsive examples
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Responsive layout
</div>
```

---

## Common Patterns

### Form Layout

```tsx
import { Input, Button, Form, Label, Alert } from '@/components/ui';

export function MyForm() {
  return (
    <Form className="max-w-md">
      <Alert variant="info">Complete the form below</Alert>

      <div className="mb-4">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" placeholder="Enter your name" />
      </div>

      <div className="mb-4">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="email@example.com" />
      </div>

      <div className="mb-4">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" placeholder="Your message" rows={4} />
      </div>

      <div className="flex gap-2">
        <Button variant="primary">Save</Button>
        <Button variant="secondary">Cancel</Button>
      </div>
    </Form>
  );
}
```

### Data Table

```tsx
import { Table, Badge, Button } from '@/components/ui';

export function EmployeeTable({ employees }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp) => (
          <tr key={emp.id}>
            <td>{emp.name}</td>
            <td>
              <Badge variant={emp.status === 'active' ? 'success' : 'warning'}>
                {emp.status}
              </Badge>
            </td>
            <td>
              <Button variant="secondary" size="sm">Edit</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
```

### Modal Dialog

```tsx
import { Modal, Button, Input, Label } from '@/components/ui';
import { useState } from 'react';

export function AddEmployeeModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header>Add Employee</Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <Label htmlFor="name">Employee Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(name)}>Add</Button>
      </Modal.Footer>
    </Modal>
  );
}
```

### Loading State

```tsx
import { Spinner, Alert } from '@/components/ui';

export function DataView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return <div>{/* render data */}</div>;
}
```

### Error Handling

```tsx
import { Alert } from '@/components/ui';

export function MyView() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <Alert variant="error">
        <strong>Error:</strong> {error.message}
      </Alert>
    );
  }

  return <div>{/* render content */}</div>;
}
```

### Empty State

```tsx
import { EmptyState } from '@/components/ui';

export function EmployeeList({ employees }) {
  if (employees.length === 0) {
    return <EmptyState title="No employees found" message="Add your first employee to get started" />;
  }

  return <div>{/* render list */}</div>;
}
```

### Pagination

```tsx
import { Pagination, Table } from '@/components/ui';
import { useState } from 'react';

export function PaginatedList({ items }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const total = items.length;
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <Table>
        {/* render pageItems */}
      </Table>
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        showArrows={true}
        siblingCount={2}
      />
    </>
  );
}
```

### Toast Notifications

```tsx
import { Toast } from '@/components/ui';
import { useState } from 'react';

export function NotificationExample() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, variant) => {
    const id = Date.now();
    setToasts([...toasts, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  return (
    <div>
      <div className="space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>
      <button onClick={() => showToast('Success!', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error!', 'error')}>Show Error</button>
    </div>
  );
}
```

### Breadcrumb Navigation

```tsx
import { Breadcrumb } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

export function BreadcrumbExample() {
  const navigate = useNavigate();

  return (
    <Breadcrumb
      items={[
        { label: 'Home', href: '/' },
        { label: 'Employees', href: '/employees' },
        { label: 'John Doe', current: true }
      ]}
      onNavigate={(href) => navigate(href)}
    />
  );
}
```

### Tabs Interface

```tsx
import { Tabs } from '@/components/ui';

export function TabbedView() {
  return (
    <Tabs
      items={[
        {
          id: 'personal',
          label: 'Personal Info',
          content: <PersonalInfo />
        },
        {
          id: 'employment',
          label: 'Employment',
          content: <EmploymentInfo />
        },
        {
          id: 'vacation',
          label: 'Vacation',
          content: <VacationInfo />
        }
      ]}
      defaultTab="personal"
      onChange={(tabId) => console.log('Selected:', tabId)}
    />
  );
}
```

### Dropdown Selection

```tsx
import { Dropdown } from '@/components/ui';
import { useState } from 'react';

export function DropdownExample() {
  const [shiftType, setShiftType] = useState('morning');

  return (
    <div>
      <Dropdown
        options={[
          { value: 'morning', label: 'Morning (6am-2pm)' },
          { value: 'afternoon', label: 'Afternoon (2pm-10pm)' },
          { value: 'night', label: 'Night (10pm-6am)' }
        ]}
        value={shiftType}
        onChange={setShiftType}
        placeholder="Select shift type"
      />
    </div>
  );
}
```

### Checkbox Input

```tsx
import { Checkbox } from '@/components/ui';
import { useState } from 'react';

export function CheckboxExample() {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  return (
    <div className="space-y-4">
      <Checkbox
        id="terms"
        label="I agree to the Terms of Service"
        checked={terms}
        onChange={(e) => setTerms(e.target.checked)}
      />
      <Checkbox
        id="privacy"
        label="I agree to the Privacy Policy"
        checked={privacy}
        onChange={(e) => setPrivacy(e.target.checked)}
        error={privacy ? '' : 'Must accept to continue'}
      />
    </div>
  );
}
```

### Radio Group Selection

```tsx
import { RadioGroup } from '@/components/ui';
import { useState } from 'react';

export function RadioExample() {
  const [department, setDepartment] = useState('cocina');

  return (
    <RadioGroup
      legend="Select your department"
      options={[
        { value: 'cocina', label: 'Kitchen' },
        { value: 'atencion', label: 'Customer Service' },
        { value: 'barra', label: 'Bar' },
        { value: 'direccion', label: 'Management' }
      ]}
      value={department}
      onChange={setDepartment}
      orientation="vertical"
    />
  );
}
```

### Loading State with Spinner

```tsx
import { Spinner } from '@/components/ui';

export function DataLoading() {
  return (
    <div className="flex justify-center items-center h-64">
      <Spinner
        size="md"
        color="indigo"
        label="Loading employee data..."
      />
    </div>
  );
}
```

---

## Responsive Design

### Mobile-First Approach

Start with mobile styles, then add breakpoints:

```tsx
// 1 column on mobile, 2 on tablet (md), 3 on desktop (lg)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>
```

### Common Breakpoints

- **sm**: 640px (small mobile)
- **md**: 768px (tablet)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)

### Responsive Classes

```tsx
// Text size
<p className="text-sm md:text-base lg:text-lg">Responsive text</p>

// Padding
<div className="p-2 md:p-4 lg:p-6">Responsive padding</div>

// Display
<div className="hidden md:block">Visible on tablet and up</div>
<div className="md:hidden">Hidden on tablet and up</div>

// Flex direction
<div className="flex flex-col md:flex-row gap-4">Stack on mobile, row on tablet+</div>
```

---

## Accessibility Checklist

When using components, ensure:

- [ ] All `<input>` elements have associated `<label>`
- [ ] Buttons have descriptive text or `aria-label`
- [ ] Icons include `aria-label` or adjacent text
- [ ] Color is not the only indicator (use text + icons)
- [ ] Focus indicators visible when tabbing
- [ ] Error messages linked to form fields via `aria-describedby`
- [ ] Modals have focus trap and `role="dialog"`
- [ ] Loading states announced via `aria-busy="true"`
- [ ] Contrast ratio ≥4.5:1 for normal text

Example:
```tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    aria-describedby="email-error"
  />
  {error && <p id="email-error" className="text-red-600">{error}</p>}
</div>
```

---

## Component Props Reference

### Button

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'; // default: primary
  size?: 'sm' | 'md' | 'lg'; // default: md
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children: React.ReactNode;
  aria-label?: string;
}
```

### Input

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
  className?: string;
  aria-describedby?: string;
}
```

### Card

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated'; // default: default
}
```

### Alert

```tsx
interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}
```

### Badge

```tsx
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}
```

### Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg'; // default: md
}
```

---

## Troubleshooting

### Component Not Displaying

1. Check import path: `from '@/components/ui'` or `from '@/components/ui/Button'`
2. Verify component is exported in `ui/index.ts`
3. Check for typos in component name

### Styling Issues

1. Ensure Tailwind CSS is imported in `globals.css`
2. Verify Tailwind config includes `frontend/src/**/*.{tsx,ts}` in content paths
3. Check for conflicting CSS classes (use `!important` sparingly)

### Accessibility Problems

1. Run Lighthouse audit: DevTools → Lighthouse → Accessibility
2. Check focus indicators: Tab through all interactive elements
3. Verify color contrast: Use WebAIM contrast checker
4. Test keyboard navigation: Use only keyboard to navigate

### Performance Issues

1. Check bundle size: `npm run build` and review output
2. Use React DevTools Profiler to identify slow components
3. Consider code splitting for large views
4. Verify no unused dependencies

---

## Best Practices

1. **Use components, not custom HTML**: Always import Button instead of `<button>`
2. **Prefer Tailwind utilities**: Use `className="text-lg font-bold"` not inline styles
3. **Keep views clean**: Extract complex sections into sub-components
4. **Test accessibility**: Use keyboard navigation and screen readers
5. **Follow naming conventions**: Views in `/views/`, components in `/components/`
6. **Document new components**: Add JSDoc comments to component props
7. **Test responsive design**: Preview on mobile (375px), tablet (768px), desktop (1280px)
8. **Keep bundle small**: Avoid importing unused components

---

## Additional Resources

- **Design System**: `/specs/003-ui-redesign/data-model.md`
- **Component Specs**: `/specs/003-ui-redesign/contracts/`
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev
- **React Router**: https://reactrouter.com
- **TypeScript**: https://www.typescriptlang.org/docs

---

## Contributing

To add or modify components:

1. Create/edit component in `frontend/src/components/ui/ComponentName.tsx`
2. Add TypeScript types for props
3. Write unit tests in `frontend/tests/components/ui/ComponentName.test.tsx`
4. Update `ui/index.ts` exports
5. Add contract spec in `specs/003-ui-redesign/contracts/component-name.md`
6. Run tests: `npm run test`
7. Check accessibility: `npm run build && lighthouse http://localhost:5173`
8. Commit: `git commit -m "refactor: add|update ComponentName"`
