# Component Contract: Input

**Feature**: UI Redesign & Consistency (`003-ui-redesign`)
**Component**: Input
**Status**: Specification
**Date**: 2026-02-28

---

## Purpose

Reusable input component for text, email, password, and other input types. Provides consistent styling, validation feedback, and accessibility across forms.

---

## Interface

```typescript
interface InputProps {
  /**
   * HTML input type
   * @default 'text'
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Current value
   */
  value?: string;

  /**
   * Change handler
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Blur handler
   */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * Focus handler
   */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Loading state (shows spinner)
   * @default false
   */
  loading?: boolean;

  /**
   * Error message (displays below input)
   */
  error?: string;

  /**
   * Help text (displays below input)
   */
  helpText?: string;

  /**
   * HTML id attribute (required for <label>)
   */
  id?: string;

  /**
   * HTML name attribute
   */
  name?: string;

  /**
   * Required field indicator
   * @default false
   */
  required?: boolean;

  /**
   * Min value (for number type)
   */
  min?: number | string;

  /**
   * Max value (for number type)
   */
  max?: number | string;

  /**
   * Step value (for number type)
   */
  step?: number | string;

  /**
   * Autocomplete attribute
   */
  autoComplete?: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessibility description (for error/help text)
   */
  'aria-describedby'?: string;

  /**
   * Accessibility label required
   */
  'aria-label'?: string;

  /**
   * Pattern for validation
   */
  pattern?: string;
}

type Input = React.FC<InputProps>;
```

---

## Visual Specifications

### Default State

**Styling**:
- Background: White (`#FFFFFF`)
- Border: 1px Slate-200
- Border Radius: 6px (rounded-md)
- Padding: 8px 12px
- Font Size: 16px (text-base)
- Font Family: System font (sans-serif)
- Text Color: Slate-700
- Placeholder Color: Slate-500

**CSS Classes**:
```
border border-slate-200 rounded-md px-3 py-2 text-base text-slate-700 placeholder-slate-500 bg-white
```

### Focus State

**Styling**:
- Border: 1px Indigo-600
- Outline: 2px solid Indigo-600 with 2px offset
- Background: White (unchanged)
- Shadow: `0 0 0 3px rgba(79, 70, 229, 0.1)` (Indigo glow)

**CSS Classes**:
```
focus:border-indigo-600 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 focus:shadow-sm
```

### Filled State

**Styling**:
- Same as default, but with user input
- Text Color: Slate-900 (user's input)
- Placeholder hidden when value present

### Error State

**Display**:
- Border: 1px Red-600
- Border Color: Red-600
- Error message displayed below in Red-600
- Icon (optional): Red X icon inside input or above

**CSS Classes**:
```
border-red-600 text-red-600
```

**Error Message Styling**:
- Font Size: 12px (text-xs)
- Font Weight: 400 (regular)
- Color: Red-600
- Margin Top: 4px (mt-1)

### Disabled State

**Styling**:
- Background: Slate-100
- Border: 1px Slate-200
- Text Color: Slate-400
- Cursor: `not-allowed`
- Interaction: Prevented

**CSS Classes**:
```
disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
```

### Loading State

**Display**:
- Spinner icon on right side
- User can still see input
- Interaction not prevented (unlike Button loading)
- Spinner animation: 1-second rotation

---

## Validation & Error Handling

### Error Display

```tsx
<Input
  id="email"
  type="email"
  error="Invalid email format"
  aria-describedby="email-error"
/>
<p id="email-error" className="text-xs text-red-600 mt-1">
  Invalid email format
</p>
```

### Help Text Display

```tsx
<Input
  id="password"
  type="password"
  helpText="At least 8 characters with uppercase and number"
  aria-describedby="password-help"
/>
<p id="password-help" className="text-xs text-slate-500 mt-1">
  At least 8 characters with uppercase and number
</p>
```

### Validation Example

```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

const validateEmail = (value: string) => {
  if (!value.includes('@')) {
    setError('Email must contain @');
  } else {
    setError('');
  }
};

<Input
  id="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  onBlur={() => validateEmail(email)}
  error={error}
/>
```

---

## Accessibility

### WCAG AA Requirements

1. **Focus Indicator**:
   - 2px solid outline in Indigo-600
   - 2px offset from border
   - Always visible when focused

2. **Color Contrast**:
   - Text on white background: Slate-700 = 12:1 ✓
   - Error text (Red-600) on white = 5.3:1 ✓
   - Help text (Slate-500) on white = 4.6:1 ✓
   - Label required (via `<label>` element)

3. **Label Association**:
   - Every input must have `<label htmlFor="id">`
   - Input must have matching `id`
   - Never rely on placeholder as label

4. **Error Association**:
   - Error text has unique id (e.g., `email-error`)
   - Input has `aria-describedby="email-error"`
   - Screen reader announces error to user

5. **Keyboard Navigation**:
   - Tab-reachable
   - Enter activates (form submission)
   - Type characters to input text
   - No keyboard trap

### Implementation

```tsx
// Good: Labeled input with error
<div>
  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
    Email <span className="text-red-600">*</span>
  </label>
  <Input
    id="email"
    type="email"
    error={error}
    aria-describedby={error ? 'email-error' : undefined}
  />
  {error && (
    <p id="email-error" className="text-xs text-red-600 mt-1">
      {error}
    </p>
  )}
</div>

// Bad: No label, placeholder used as label
<Input placeholder="Email" />

// Bad: Label not associated
<label>Email</label>
<Input type="email" />
```

---

## Input Types

### Text

```tsx
<Input type="text" placeholder="Enter name" />
```

**Validation**: Optional

### Email

```tsx
<Input type="email" placeholder="user@example.com" />
```

**Validation**: HTML5 email validation + custom check

### Password

```tsx
<Input type="password" placeholder="Enter password" />
```

**Validation**: Min 8 characters, uppercase, number (custom)

### Number

```tsx
<Input type="number" min="0" max="100" step="1" />
```

**Validation**: Min/max bounds

### Search

```tsx
<Input type="search" placeholder="Search employees..." />
```

**Validation**: Optional (for filtering)

### Telephone

```tsx
<Input type="tel" placeholder="555-123-4567" />
```

**Validation**: Phone format (custom)

### URL

```tsx
<Input type="url" placeholder="https://example.com" />
```

**Validation**: URL format (HTML5)

---

## Component Behavior

### Change Handler

```tsx
const [value, setValue] = useState('');

<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Blur Validation

```tsx
const [error, setError] = useState('');

<Input
  onBlur={() => {
    if (value.length < 3) {
      setError('At least 3 characters required');
    }
  }}
/>
```

### Clear Button (Optional)

```tsx
const [value, setValue] = useState('');

<div className="relative">
  <Input
    value={value}
    onChange={(e) => setValue(e.target.value)}
  />
  {value && (
    <button
      className="absolute right-3 top-1/2 -translate-y-1/2"
      onClick={() => setValue('')}
      aria-label="Clear input"
    >
      <XIcon className="w-4 h-4" />
    </button>
  )}
</div>
```

---

## Test Requirements

### Unit Tests

```tsx
describe('Input', () => {
  it('renders text input by default', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  it('updates value on change', () => {
    const { rerender } = render(<Input value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays help text', () => {
    render(<Input helpText="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('disables input when disabled={true}', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('has focus outline when focused', () => {
    render(<Input />);
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('associates error text with aria-describedby', () => {
    render(<Input error="Error" aria-describedby="error-id" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'error-id');
  });
});
```

### Accessibility Tests

```tsx
describe('Input Accessibility', () => {
  it('requires associated label', () => {
    // Use axe-core to detect missing label
  });

  it('has visible focus outline', () => {
    // Visual regression: 2px outline Indigo-600
  });

  it('announces errors to screen readers', () => {
    // aria-describedby connects error text
  });
});
```

---

## Examples

### Basic Input

```tsx
<Input placeholder="Enter text" />
```

### With Label

```tsx
<div className="mb-4">
  <label htmlFor="username" className="block text-sm font-medium mb-1">
    Username
  </label>
  <Input id="username" placeholder="john_doe" />
</div>
```

### Email with Validation

```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

<div className="mb-4">
  <label htmlFor="email" className="block text-sm font-medium mb-1">
    Email <span className="text-red-600">*</span>
  </label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    onBlur={() => {
      if (!email.includes('@')) {
        setError('Invalid email');
      } else {
        setError('');
      }
    }}
    error={error}
    aria-describedby={error ? 'email-error' : undefined}
    required
  />
  {error && <p id="email-error" className="text-xs text-red-600 mt-1">{error}</p>}
</div>
```

### Number Input

```tsx
<div className="mb-4">
  <label htmlFor="quantity" className="block text-sm font-medium mb-1">
    Quantity (1-100)
  </label>
  <Input
    id="quantity"
    type="number"
    min="1"
    max="100"
    defaultValue="1"
  />
</div>
```

### Disabled Input

```tsx
<Input placeholder="You cannot edit this" disabled />
```

### Loading State

```tsx
<Input
  placeholder="Checking availability..."
  loading
/>
```

---

## Browser Support

- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

No IE11 support.

---

## Performance

- **Render time**: <5ms
- **Input response**: <30ms (instant)
- **Bundle impact**: ~1.5KB (minified)

---

## Future Enhancements

- Floating labels
- Character counter
- Real-time validation
- Copy-to-clipboard button
- Password strength indicator
- Autocomplete suggestions
- Dark mode variant
