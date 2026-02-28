import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '../../../src/components/ui/Pagination';

describe('Pagination Component', () => {
  it('renders page buttons', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  it('marks current page as selected', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    const currentPageButton = screen.getByRole('button', { name: '3' });
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
  });

  it('calls onPageChange when page button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
    const page3Button = screen.getByRole('button', { name: '3' });

    await user.click(page3Button);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    const nextButton = screen.getByLabelText('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('navigates to previous page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    const prevButton = screen.getByLabelText('Previous page');

    await user.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('navigates to next page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    const nextButton = screen.getByLabelText('Next page');

    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('shows ellipsis for skipped pages', () => {
    render(<Pagination currentPage={1} totalPages={10} onPageChange={vi.fn()} siblingCount={1} />);
    // With siblingCount=1, should show: 1 ... 10
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} disabled />);
    const page1Button = screen.getByRole('button', { name: '1' });
    expect(page1Button).toBeDisabled();
  });

  it('does not show arrows when showArrows is false', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={vi.fn()}
        showArrows={false}
      />
    );
    expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
  });

  it('shows first and last page buttons when showEdges is true', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        onPageChange={vi.fn()}
        showEdges={true}
        siblingCount={1}
      />
    );
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
  });
});
