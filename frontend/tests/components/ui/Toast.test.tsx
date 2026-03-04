import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Toast from '../../../src/components/ui/Toast';

describe('Toast Component', () => {
  it('renders toast message', () => {
    render(<Toast message="Operation successful" variant="success" />);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('displays title when provided', () => {
    render(
      <Toast message="Success message" title="Success" variant="success" />
    );
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { container, rerender } = render(
      <Toast message="Success" variant="success" />
    );
    expect(container.querySelector('.bg-green-50')).toBeInTheDocument();

    rerender(<Toast message="Error" variant="error" />);
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();

    rerender(<Toast message="Warning" variant="warning" />);
    expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument();

    rerender(<Toast message="Info" variant="info" />);
    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        message="Test message"
        onDismiss={onDismiss}
      />
    );
    const dismissButton = screen.getByLabelText('Dismiss');
    dismissButton.click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after duration', async () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        message="Auto dismiss"
        duration={100}
        onDismiss={onDismiss}
      />
    );
    await waitFor(() => expect(onDismiss).toHaveBeenCalled(), { timeout: 200 });
  });

  it('does not auto-dismiss when duration is 0', async () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        message="No auto dismiss"
        duration={0}
        onDismiss={onDismiss}
      />
    );
    await waitFor(() => expect(onDismiss).not.toHaveBeenCalled(), {
      timeout: 100,
    });
  });
});
