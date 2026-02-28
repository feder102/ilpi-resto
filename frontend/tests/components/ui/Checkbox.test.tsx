import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkbox from '../../../src/components/ui/Checkbox';

describe('Checkbox Component', () => {
  it('renders checkbox input', () => {
    const { container } = render(<Checkbox />);
    expect(container.querySelector('input[type="checkbox"]')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<Checkbox id="test-checkbox" label="Agree to terms" />);
    expect(screen.getByText('Agree to terms')).toBeInTheDocument();
  });

  it('toggles checked state on click', async () => {
    const user = userEvent.setup();
    const { container } = render(<Checkbox id="test-checkbox" />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('calls onChange when toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Checkbox onChange={onChange} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalled();
  });

  it('displays error message when provided', () => {
    render(<Checkbox error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text when provided', () => {
    render(<Checkbox helperText="Check this to continue" />);
    expect(screen.getByText('Check this to continue')).toBeInTheDocument();
  });

  it('disables checkbox when disabled prop is true', () => {
    const { container } = render(<Checkbox disabled />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeDisabled();
  });

  it('supports indeterminate state', () => {
    const { container } = render(<Checkbox indeterminate />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });
});
