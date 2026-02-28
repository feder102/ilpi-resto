import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RadioGroup from '../../../src/components/ui/Radio';

describe('RadioGroup Component', () => {
  const options = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'night', label: 'Night' },
  ];

  it('renders all radio options', () => {
    render(<RadioGroup options={options} />);
    expect(screen.getByLabelText('Morning')).toBeInTheDocument();
    expect(screen.getByLabelText('Afternoon')).toBeInTheDocument();
    expect(screen.getByLabelText('Night')).toBeInTheDocument();
  });

  it('displays legend when provided', () => {
    render(<RadioGroup options={options} legend="Select shift" />);
    expect(screen.getByText('Select shift')).toBeInTheDocument();
  });

  it('selects radio button on click', async () => {
    const user = userEvent.setup();
    render(<RadioGroup options={options} />);
    const afternoonRadio = screen.getByLabelText('Afternoon') as HTMLInputElement;

    expect(afternoonRadio.checked).toBe(false);
    await user.click(afternoonRadio);
    expect(afternoonRadio.checked).toBe(true);
  });

  it('calls onChange when radio is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RadioGroup options={options} onChange={onChange} />);
    const afternoonRadio = screen.getByLabelText('Afternoon');

    await user.click(afternoonRadio);
    expect(onChange).toHaveBeenCalledWith('afternoon');
  });

  it('marks selected value', () => {
    render(<RadioGroup options={options} value="night" />);
    const nightRadio = screen.getByLabelText('Night') as HTMLInputElement;
    expect(nightRadio.checked).toBe(true);
  });

  it('displays error message when provided', () => {
    render(<RadioGroup options={options} error="Please select an option" />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('disables individual options when marked', () => {
    const optionsWithDisabled = [
      ...options,
    ];
    optionsWithDisabled[1].disabled = true;
    render(<RadioGroup options={optionsWithDisabled} />);
    const afternoonRadio = screen.getByLabelText('Afternoon') as HTMLInputElement;
    expect(afternoonRadio).toBeDisabled();
  });

  it('disables all options when disabled prop is true', () => {
    render(<RadioGroup options={options} disabled />);
    const morningRadio = screen.getByLabelText('Morning') as HTMLInputElement;
    expect(morningRadio).toBeDisabled();
  });

  it('supports horizontal orientation', () => {
    const { container } = render(<RadioGroup options={options} orientation="horizontal" />);
    const fieldset = container.querySelector('fieldset');
    expect(fieldset).toHaveClass('flex');
  });
});
