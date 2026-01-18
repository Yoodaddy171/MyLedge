interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  startIndex,
  endIndex
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="bg-slate-50/50 p-4 border-t-2 border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 px-6">
      {/* Items per page selector */}
      <div className="flex items-center gap-3">
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase outline-none"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <span className="text-[9px] font-black text-slate-400 uppercase">
          {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
        </span>
      </div>

      {/* Page numbers */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          Previous
        </button>

        <div className="hidden sm:flex items-center gap-2">
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
                className={`w-8 h-8 rounded-lg text-[9px] font-black uppercase transition-all ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <span className="text-slate-400 font-black">...</span>
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded-lg text-[9px] font-black uppercase bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          Next
        </button>
      </div>

      {/* Mobile page indicator */}
      <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
