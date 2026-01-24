'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  showCloseButton = true,
  closeOnOverlayClick = true
}: ModalProps) {
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden pointer-events-none">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, type: 'spring' }}
            onClick={handleContentClick}
            className={cn(
              'relative bg-white w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden text-black pointer-events-auto',
              sizeClasses[size],
              className
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                {title && (
                  <h2 className="text-xl font-bold text-slate-900">
                    {title}
                  </h2>
                )}

                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors ml-auto"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="overflow-y-auto overscroll-contain max-h-[calc(90vh-120px)] p-6" style={{WebkitOverflowScrolling: 'touch'}}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Confirmation Modal Variant
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}: ConfirmModalProps) {
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          {title}
        </h3>

        <p className="text-sm text-slate-600 mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 text-sm"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            className={cn(
              'flex-1 text-white font-semibold py-3 rounded-xl transition-all shadow-lg text-sm',
              variantStyles[variant]
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
