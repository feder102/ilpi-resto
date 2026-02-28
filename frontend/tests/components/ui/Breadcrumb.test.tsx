import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Breadcrumb from '../../../src/components/ui/Breadcrumb';

describe('Breadcrumb Component', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', current: true },
  ];

  it('renders breadcrumb items', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders clickable links for non-current items', () => {
    render(<Breadcrumb items={items} />);
    const homeLink = screen.getByRole('button', { name: 'Home' });
    expect(homeLink).toBeInTheDocument();
  });

  it('calls onNavigate when breadcrumb is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Breadcrumb items={items} onNavigate={onNavigate} />);
    const homeLink = screen.getByRole('button', { name: 'Home' });
    await user.click(homeLink);
    expect(onNavigate).toHaveBeenCalledWith('/', 'Home');
  });

  it('marks current item with aria-current="page"', () => {
    const { container } = render(<Breadcrumb items={items} />);
    const currentItem = container.querySelector('[aria-current="page"]');
    expect(currentItem).toBeInTheDocument();
    expect(currentItem?.textContent).toBe('Settings');
  });

  it('renders nav with aria-label="Breadcrumb"', () => {
    render(<Breadcrumb items={items} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
  });
});
