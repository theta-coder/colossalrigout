'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array with dynamic windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        pages[pages.length - 1] !== '...' &&
        (i < currentPage - delta || i > currentPage + delta)
      ) {
        pages.push('...');
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-200 text-xs font-medium ${className}`}
    >
      {/* Items Counter */}
      <div className="text-neutral-500 font-semibold text-center sm:text-left">
        Showing <span className="text-neutral-900 font-black">{startItem}</span> to{' '}
        <span className="text-neutral-900 font-black">{endItem}</span> of{' '}
        <span className="text-neutral-900 font-black">{totalItems}</span> items
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white text-neutral-700 font-bold transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Page Number Pills */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-neutral-400 font-bold">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white border border-neutral-300 text-neutral-700 hover:border-black hover:bg-neutral-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white text-neutral-700 font-bold transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Next Page"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
