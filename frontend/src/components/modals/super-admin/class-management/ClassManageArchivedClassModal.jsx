import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import ClassManageArchivedCard from "./ClassManageArchivedClassCard"; 
import ClassManageViewClassModal from "./ClassManageViewClassModal";

export default function ClassManageArchivedClassesModal({ isOpen, onClose }) {
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedArchivedClass, setSelectedArchivedClass] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchArchived();
    }
  }, [isOpen, currentPage]);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const { data, headers } = await axios.get('http://localhost:3000/api/sections/archived-list', { 
        params: { page: currentPage, limit },
        withCredentials: true 
      });
      
      if (data.success) {
        setArchivedClasses(data.classes);
        const totalCount = parseInt(headers['x-total-count']) || data.totalCount || 0;
        setTotalPages(Math.ceil(totalCount / limit));
      }
    } catch (error) {
      console.error("Error fetching archived classes:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- THE SLIDING PAGINATION LOGIC ---
  const getPageNumbers = () => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleViewDetails = async (cls) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/sections/archived/${cls._id}`, {
        withCredentials: true 
      });

      if (response.data.success) {
        setSelectedArchivedClass(response.data.classData);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching archived class details:", error);
    }
  };

  if (!isOpen) return null;

  const visiblePages = getPageNumbers();

  return createPortal(
    <>
      <div className="modal-overlay active" onClick={onClose}>
        <div className="modal-container max-w-[550px]" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cgray">history</span>
              <h2 className="text-cdark text-[18px] font-bold">Class Archives</h2>
            </div>
            <button onClick={onClose} className="text-cgray hover:text-cdark border-none bg-transparent cursor-pointer">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="modal-body p-6">
            <div className="flex flex-col gap-3 min-h-[300px]">
              {loading ? (
                <p className="text-center p-8 text-cgray">Loading archives...</p>
              ) : archivedClasses.length === 0 ? (
                <p className="text-center p-8 text-cgray italic">No archived classes found.</p>
              ) : (
                archivedClasses.map((cls) => (
                  <ClassManageArchivedCard 
                    key={cls._id} 
                    cls={cls} 
                    onClick={() => handleViewDetails(cls)}
                  />
                ))
              )}
            </div>

            {/* --- ADAPTED ADVANCED PAGINATION --- */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-cgray">
                Showing page <b>{currentPage}</b> of <b>{totalPages || 1}</b>
              </p>
              
              <div className="flex gap-1">
                {/* Previous Button */}
                <button 
                  className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50" 
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>

                {/* First Page Link if necessary */}
                {visiblePages[0] > 1 && (
                  <>
                    <button className="btn btn-outline h-8 w-8 p-0! text-xs" onClick={() => setCurrentPage(1)}>1</button>
                    <span className="px-1 self-center text-gray-400 text-xs">...</span>
                  </>
                )}

                {/* Sliding Numbers */}
                {visiblePages.map(pageNum => (
                  <button 
                    key={pageNum}
                    className={`btn btn-outline h-8 w-8 p-0! transition-colors flex items-center justify-center font-medium text-xs ${ 
                        currentPage === pageNum  
                        ? 'bg-[#3ab0f9]! text-white! border-[#3ab0f9]! shadow-sm' 
                        : 'hover:bg-blue-50 text-gray-600 border-gray-200'
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Last Page Link if necessary */}
                {visiblePages.slice(-1)[0] < totalPages && (
                  <>
                    <span className="px-1 self-center text-gray-400 text-xs">...</span>
                    <button className="btn btn-outline h-8 w-8 p-0! text-xs" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                  </>
                )}

                {/* Next Button */}
                <button 
                  className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50"
                  disabled={currentPage === totalPages || totalPages === 0 || loading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClassManageViewClassModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        classData={selectedArchivedClass}
      />
    </>,
    document.body
  );
}