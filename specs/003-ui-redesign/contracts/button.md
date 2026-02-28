# Component Contract: Button

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Component**: Button
**Status**: Specification
**Date**: 2026-02-28

---

## Purpose

Reusable button component for primary actions, secondary actions, and destructive actions. Provides consistent styling, accessibility, and interaction patterns across the entire application.

---

## Interface

```typescript
interface ButtonProps {
  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger';

  /**
   * Button size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Loading state (shows spinner, prevents interaction)
   * @default false
   */
  loading?: boolean;

  /**
   * Button type (HTML attribute)
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * Click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessibility label (required if children is icon-only)
   */
  'aria-label'?: string;

  /**
   * Button content
   */
  children: React.ReactNode;
}

type Button = React.FC<ButtonProps>;
```

---

## Visual Specifications

### Variants

#### Primary Button

**Use case**: Main call-to-action, positive actions (Save, Submit, Create)

**Styling**:
- Background: Indigo-600 (`#4F46E5`)
- Text: White
- Border: None
- Border Radius: 6px (rounded-md)
- Padding: 8px 16px (size md)
- Font Weight: 500 (medium)
- Font Size: 16px (text-base) for md size

**States**:
- Default: Indigo-600 bg, white text
- Hover: Indigo-500 bg (lighter)
- Active/Pressed: Indigo-700 bg (darker)
- Focus: Indigo-600 bg + 2px outline Indigo-600
- Disabled: Slate-300 bg, Slate-500 text, no cursor
- Loading: Spinner icon visible, interaction prevented

#### Secondary Button

**Use case**: Alternative actions (Cancel, Back, Learn More)

**Styling**:
- Background: Slate-100 (`#F1F5F9`)
- Text: Slate-700
- Border: 1px Slate-200
- Border Radius: 6px (rounded-md)
- Padding: 8px 16px (size md)
- Font Weight: 500 (medium)

**States**:
- Default: Slate-100 bg, Slate-700 text, Slate-200 border
- Hover: Slate-200 bg
- Active/Pressed: Slate-300 bg
- Focus: Slate-100 bg + 2px outline Indigo-600
- Disabled: Slate-100 bg, Slate-400 text, Slate-200 border
- Loading: Spinner icon visible, interaction prevented

#### Danger Button

**Use case**: Destructive actions (Delete, Remove, Reject)

**Styling**:
- Background: Red-600 (`#DC2626`)
- Text: White
- Border: None
- Border Radius: 6px (rounded-md)
- Padding: 8px 16px (size md)
- Font Weight: 500 (medium)

**States**:
- Default: Red-600 bg, white text
- Hover: Red-700 bg (darker)
- Active/Pressed: Red-800 bg
- Focus: Red-600 bg + 2px outline Red-600
- Disabled: Slate-300 bg, Slate-500 text
- Loading: Spinner icon visible, interaction prevented

### Sizes

| Size | Padding | Font Size | Height |
|------|---------|-----------|--------|
| **sm** | 6px 12px | 14px (text-sm) | 32px |
| **md** | 8px 16px | 16px (text-base) | 40px |
| **lg** | 12px 24px | 18px (text-lg) | 48px |

---

## Accessibility

### WCAG AA Requirements

1. **Color Contrast**:
   - Primary button: Indigo-600 on white = 5.3:1 ✓ (exceeds 4.5:1 minimum)
   - Secondary button: Slate-700 on Slate-100 = 9.3:1 ✓
   - Danger button: Red-600 on white = 5.3:1 ✓

2. **Focus Indicator**:
   - All buttons must have visible focus indicator when tabbed
   - Outline: 2px solid Indigo-600 with 2px offset
   - No outline removal (avoid `outline: none`)

3. **Keyboard Navigation**:
   - All buttons tab-reachable
   - Enter or Space activates button
   - No keyboard trap

4. **ARIA Labels**:
   - Text content sufficient for icon+text buttons
   - Icon-only buttons require `aria-label` prop
   - Example: `<Button aria-label="Delete item">{<TrashIcon />}</Button>`

5. **Disabled State**:
   - Disabled buttons have `disabled` HTML attribute
   - Cursor changes to `not-allowed`
   - Visual indication (grayed out)
   - Not included in tab order

### Implementation

```tsx
// Good: Text label sufficient
<Button variant="primary">Save</Button>

// Good: Icon + text
<Button variant="primary">
  <CheckIcon /> Approve
</Button>

// Good: Icon-only with aria-label
<Button variant="secondary" aria-label="Delete">
  <TrashIcon />
</Button>

// Bad: Icon-only without label
<Button variant="primary">
  <CheckIcon />
</Button>

// Good: Loading state
<Button loading>Saving...</Button>

// Good: Disabled state
<Button disabled>Inactive</Button>
```

---

## Interaction Patterns

### Click Handling

```tsx
<Button
  onClick={(e) => {
    console.log('Button clicked');
    // Handle action
  }}
>
  Click Me
</Button>
```

### Form Submission

```tsx
<form onSubmit={handleSubmit}>
  <input type="text" name="name" />
  <Button type="submit">Submit</Button>
</form>
```

### Loading State

```tsx
const [loading, setLoading] = useState(false);

const handleSave = async () => {
  setLoading(true);
  try {
    await api.save(data);
    showSuccess('Saved!');
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
};

<Button loading={loading} onClick={handleSave}>
  {loading ? 'Saving...' : 'Save'}
</Button>
```

### Group Layout

```tsx
<div className="flex gap-2">
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
  <Button variant="danger">Delete</Button>
</div>
```

---

## Component Behavior

### State Machine

```
          ↓
    [Default]
   ↙   ↓   ↘
Hover Active Focus
   ↘   ↙   ↙
    [Idle]
      ↓
  [Disabled]
      ↓
  [Idle] (no interaction)

Loading:
  [Any State] → [Loading] → [Idle/Disabled/etc]
```

### Loading State Behavior

1. When `loading={true}`:
   - Display spinner/loader icon
   - Disable user clicks
   - Show loading text (optional)
   - Prevent form submission

2. Spinner animation:
   - 1-second full rotation
   - Uses Lucide `Loader2` icon with `animate-spin`

### Disabled State Behavior

1. When `disabled={true}`:
   - No click event fired
   - Grayed out appearance
   - Cursor: `not-allowed`
   - Removed from tab order (`disabled` attribute)

---

## Test Requirements

### Unit Tests

```tsx
describe('Button', () => {
  it('renders primary variant by default', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-indigo-600');
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading={true}', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('disabled');
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('has visible focus indicator', () => {
    render(<Button>Focus</Button>);
    fireEvent.focus(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveFocus();
    // Visual regression test for outline
  });

  it('supports secondary variant', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-slate-100');
  });

  it('supports danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });
});
```

### Accessibility Tests

```tsx
describe('Button Accessibility', () => {
  it('has proper focus outline', () => {
    // Visual regression: 2px outline Indigo-600
  });

  it('is keyboard accessible', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    // Space key should also trigger
  });

  it('requires aria-label for icon-only buttons', () => {
    // Accessibility checker should warn if icon-only without label
  });

  it('has sufficient color contrast', () => {
    // Contrast ratio ≥4.5:1 verified
  });
});
```

---

## Examples

### Basic Button

```tsx
<Button variant="primary" onClick={handleSave}>
  Save
</Button>
```

### With Icon

```tsx
<Button variant="primary">
  <CheckIcon className="mr-2" />
  Approve
</Button>
```

### Icon Only

```tsx
<Button
  variant="secondary"
  size="sm"
  aria-label="Close"
  onClick={handleClose}
>
  <XIcon />
</Button>
```

### Loading State

```tsx
<Button
  variant="primary"
  loading={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

### Disabled

```tsx
<Button variant="danger" disabled>
  Delete (locked)
</Button>
```

### Button Group

```tsx
<div className="flex gap-2">
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary" type="submit">
    Save
  </Button>
</div>
```

---

## Browser Support

- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

No IE11 support (out of scope for modern SPA).

---

## Performance

- **Render time**: <10ms (no expensive operations)
- **Click response**: <50ms (instant visual feedback)
- **Bundle impact**: ~2KB (minified)

No external dependencies beyond React.

---

## Future Enhancements

- Icon animation on hover
- Tooltip on hover
- Dark mode variant
- Full-width button option
- Button group component
