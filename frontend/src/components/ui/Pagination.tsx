import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showArrows?: boolean;
  showEdges?: boolean;
  disabled?: boolean;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({ currentPage, totalPages, onPageChange, siblingCount = 2, showArrows = true, showEdges = false, disabled, className, ...props }, ref) => {
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const leftSibling = Math.max(currentPage - siblingCount, 1);
      const rightSibling = Math.min(currentPage + siblingCount, totalPages);

      if (leftSibling > 1) pages.push(1);
      if (leftSibling > 2) pages.push('...');
      for (let i = leftSibling; i <= rightSibling; i++) pages.push(i);
      if (rightSibling < totalPages - 1) pages.push('...');
      if (rightSibling < totalPages) pages.push(totalPages);
      return pages;
    };

    const pages = getPageNumbers();

    const handlePageClick = (page: number | string) => {
      if (typeof page === 'number' && page !== currentPage && !disabled) {
        onPageChange(page);
      }
    };

    return (
      <div ref={ref} className={`join ${className || ''}`} {...props}>
        {showArrows && (
          <button
            className="join-item btn btn-sm"
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1 || disabled}
            aria-label="Anterior"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {showEdges && (
          <button className="join-item btn btn-sm" onClick={() => handlePageClick(1)} disabled={currentPage === 1 || disabled}>
            1
          </button>
        )}

        {pages.map((page) => (
          <button
            key={String(page)}
            className={`join-item btn btn-sm ${currentPage === page ? 'btn-primary' : ''}`}
            onClick={() => handlePageClick(page)}
            disabled={typeof page === 'string' || currentPage === page || disabled}
            aria-label={typeof page === 'number' ? `Pagina ${page}` : undefined}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        {showEdges && (
          <button className="join-item btn btn-sm" onClick={() => handlePageClick(totalPages)} disabled={currentPage === totalPages || disabled}>
            {totalPages}
          </button>
        )}

        {showArrows && (
          <button
            className="join-item btn btn-sm"
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages || disabled}
            aria-label="Siguiente"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';

export default Pagination;
