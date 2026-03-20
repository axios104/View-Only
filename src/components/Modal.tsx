// src/components/Modal.tsx
import React, { useEffect, useRef } from 'react';
import type { RoadmapNode } from '../types/roadmap';

interface ModalProps {
  // Support both prop styles:
  // 1) { isOpen, node } (older node-based modal)
  // 2) { open, title, children } (used by RoadmapView)
  open?: boolean;
  isOpen?: boolean;
  title?: string;
  node?: RoadmapNode | null;
  onClose: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, isOpen, title, onClose, node, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const isModalOpen = open ?? isOpen ?? false;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus modal for accessibility
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, onClose]);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden outline-none animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            {node ? (
              <div className="flex items-center gap-3 mb-1">
                <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20 uppercase tracking-wider">
                  {node.type}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Level {node.level}</span>
              </div>
            ) : null}
            <h2 id="modal-title" className="text-xl font-semibold text-slate-900 dark:text-white">
              {title ?? node?.title ?? 'Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {children ? (
            children
          ) : node ? (
            <>
              {node.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Description</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {node.description}
                  </p>
                </div>
              )}

              {/* Render extra Metadata mapped from the flat file */}
              {node.metadata && Object.keys(node.metadata).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Additional Details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    {Object.entries(node.metadata).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <div key={key} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            {key}
                          </dt>
                          <dd className="text-sm text-slate-900 dark:text-white">
                            {key === 'Manual URL' ? (
                              <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                                {value}
                              </a>
                            ) : (
                              value
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </>
          ) : null}
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};