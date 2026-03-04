import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner from '../../../src/components/ui/Spinner';

describe('Spinner Component', () => {
  it('renders with default props', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<Spinner label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container, rerender } = render(<Spinner size="sm" />);
    expect(container.querySelector('.w-4')).toBeInTheDocument();

    rerender(<Spinner size="md" />);
    expect(container.querySelector('.w-8')).toBeInTheDocument();

    rerender(<Spinner size="lg" />);
    expect(container.querySelector('.w-12')).toBeInTheDocument();
  });

  it('applies correct color classes', () => {
    const { container, rerender } = render(<Spinner color="indigo" />);
    expect(container.querySelector('.border-indigo-600')).toBeInTheDocument();

    rerender(<Spinner color="slate" />);
    expect(container.querySelector('.border-slate-600')).toBeInTheDocument();

    rerender(<Spinner color="white" />);
    expect(container.querySelector('.border-white')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
