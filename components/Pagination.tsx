interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  showItemsPerPage?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  startIndex,
  endIndex,
  showItemsPerPage = false
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4">
      {/* Summary Info */}
      <div className="flex items-center gap-3">
        {showItemsPerPage && itemsPerPage && onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium outline-none focus:border-blue-400 transition-colors"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        )}
        <span className="text-xs font-medium text-slate-500">
          Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
        </span>
      </div>

      {/* Page numbers */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          Prev
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <span className="text-slate-400 text-xs px-1">...</span>
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-slate-300 transition-all"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}