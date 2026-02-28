import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dropdown from '../../../src/components/ui/Dropdown';

describe('Dropdown Component', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3' },
  ];

  it('renders dropdown button with placeholder', () => {
    render(
      <Dropdown
        options={options}
        placeholder="Select an option"
      />
    );
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('opens menu on button click', async () => {
    const user = userEvent.setup();
    render(<Dropdown options={options} />);
    const button = screen.getByRole('button');
    await user.click(button);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('displays selected value', async () => {
    const user = userEvent.setup();
    render(<Dropdown options={options} value="opt2" />);
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange when option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Dropdown options={options} onChange={onChange} />);
    const button = screen.getByRole('button');
    await user.click(button);
    const option = screen.getByText('Option 2');
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith('opt2');
  });

  it('closes menu after selection', async () => {
    const user = userEvent.setup();
    render(<Dropdown options={options} onChange={vi.fn()} />);
    const button = screen.getByRole('button');
    await user.click(button);
    const option = screen.getByText('Option 2');
    await user.click(option);
    // After selection, the menu should close
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('disables disabled options', async () => {
    const user = userEvent.setup();
    const disabledOptions = [
      ...options,
    ];
    disabledOptions[1].disabled = true;
    render(<Dropdown options={disabledOptions} />);
    const button = screen.getByRole('button');
    await user.click(button);
    const disabledOption = screen.getByRole('option', { name: 'Option 2', hidden: true });
    expect(disabledOption).toBeDisabled();
  });

  it('disables entire dropdown when disabled prop is true', () => {
    render(<Dropdown options={options} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
