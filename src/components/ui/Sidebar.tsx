"use client";

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { SidebarProps } from '@/lib/interfaces';

export default function Sidebar({ 
  isOpen, 
  onClose, 
  title = "Filters", 
  children, 
  width = 'md' 
}: SidebarProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const widthClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[28rem]',
    xl: 'w-[32rem]'
  };

  return (
    <>
      {/* Backdrop - subtle overlay without darkening */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full ${widthClasses[width]} bg-blue-800/95 backdrop-blur-xl shadow-2xl border-l border-blue-700/20 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-700/20">
          <h2 id="sidebar-title" className="text-xl font-semibold text-yellow-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
