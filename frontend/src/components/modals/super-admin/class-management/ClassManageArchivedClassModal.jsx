import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import ClassManageArchivedCard from "./ClassManageArchivedClassCard"; 

export default function ClassManageArchivedClassesModal({ isOpen, onClose }) {
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5; // Smaller limit since cards are tall

  useEffect(() => {
    if (isOpen) {
      fetchArchived();
    }
  }, [isOpen, currentPage]); // Re-fetch when page changes

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const { data, headers } = await axios.get('http://localhost:3000/api/sections/archived-list', { 
        params: { page: currentPage, limit },
        withCredentials: true 
      });
      
      if (data.success) {
        setArchivedClasses(data.classes);
        // Get total from header (as per your example) or data body
        const totalCount = parseInt(headers['x-total-count']) || data.totalCount || 0;
        setTotalPages(Math.ceil(totalCount / limit));
      }
    } catch (error) {
      console.error("Error fetching archived classes:", error);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return createPortal(
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

        <div className="modal-body">
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
                />
              ))
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <p className="text-[12px] text-cgray">
              Page <b>{currentPage}</b> of <b>{totalPages || 1}</b>
            </p>
            <div className="flex gap-2">
              <button 
                className="btn btn-outline h-9 w-9 p-0 flex items-center justify-center disabled:opacity-30 border-slate-200"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button 
                className="btn btn-outline h-9 w-9 p-0 flex items-center justify-center disabled:opacity-30 border-slate-200"
                disabled={currentPage === totalPages || totalPages === 0 || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}