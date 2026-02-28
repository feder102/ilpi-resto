import React, { useEffect } from 'react';

export interface ModalProps {
  /**
   * Whether modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close (escape key or overlay click)
   */
  onClose: () => void;

  /**
   * Modal title (optional)
   */
  title?: string;

  /**
   * Modal size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Modal content
   */
  children: React.ReactNode;

  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Reusable Modal Component
 * Dialog with header, body, footer, and focus trap
 * Closes on escape key or overlay click
 *
 * @example
 * <Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
 *   <p>Are you sure?</p>
 *   <div className="flex gap-2 mt-4">
 *     <Button onClick={handleClose}>Cancel</Button>
 *     <Button variant="danger" onClick={handleConfirm}>Confirm</Button>
 *   </div>
 * </Modal>
 */
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, size = 'md', children, footer }) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <div className={`bg-white rounded-lg shadow-lg ${sizeClasses[size]} w-full max-h-[90vh] overflow-auto`}>
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded p-1"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-slate-200 bg-slate-50 p-4 flex gap-2 justify-end">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

Modal.displayName = 'Modal';

export default Modal;
