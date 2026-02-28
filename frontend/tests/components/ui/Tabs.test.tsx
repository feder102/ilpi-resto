import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tabs from '../../../src/components/ui/Tabs';

describe('Tabs Component', () => {
  const items = [
    { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
    { id: 'tab2', label: 'Tab 2', content: 'Content 2' },
    { id: 'tab3', label: 'Tab 3', content: 'Content 3' },
  ];

  it('renders all tab buttons', () => {
    render(<Tabs items={items} />);
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
  });

  it('displays default tab content', () => {
    render(<Tabs items={items} defaultTab="tab2" />);
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('switches tab content on click', async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();

    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2Button);
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('marks active tab with aria-selected="true"', async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} />);
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2);
    expect(tab2).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange when tab changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs items={items} onChange={onChange} />);
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2);
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('disables disabled tabs', () => {
    const itemsWithDisabled = [
      ...items,
    ];
    itemsWithDisabled[1].disabled = true;
    render(<Tabs items={itemsWithDisabled} />);
    const disabledTab = screen.getByRole('tab', { name: 'Tab 2' });
    expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
  });
});
