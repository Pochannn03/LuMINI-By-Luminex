import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

export function RejectedTransferHistoryModal({ isOpen, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (!isOpen) return;

    const fetchRejected = async () => {
      setLoading(true);
      try {
        const { data, headers } = await axios.get(`http://localhost:3000/api/transfer/override/rejected`, {
          params: { page: currentPage, limit },
          withCredentials: true
        });

        if (data.success) {
          setList(data.overrides);
          const totalCount = parseInt(headers['x-total-count']) || 0;
          setTotalPages(Math.ceil(totalCount / limit));
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRejected();
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container max-w-[1000px]! w-[95%]!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">history_toggle_off</span>
            <h2 className="text-[18px] font-bold">Rejected Manual Transfers</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          <div className="audit-table-container max-h-[450px] overflow-y-auto custom-scrollbar">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Guardian / Guest</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-10">Loading records...</td></tr>
                ) : list.length > 0 ? (
                  list.map((ovr) => (
                    <tr key={ovr._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-sm bg-blue-50 text-blue-500">
                            {ovr.student_details?.first_name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <div className="font-bold text-cdark">
                                {ovr.student_details?.first_name} {ovr.student_details?.last_name}
                            </div>
                            <div className="text-[10px] text-cgray">
                                {ovr.student_details?.section_details?.section_name || "No Section"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                            <span className="font-medium text-[13px]">{ovr.user_name}</span>
                            <span className="text-[10px] text-cgray">
                                {ovr.is_registered_guardian ? "Registered Parent" : "Guest / Temporary"}
                            </span>
                        </div>
                      </td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ovr.purpose === 'Pick up' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {ovr.purpose}
                        </span>
                      </td>
                      <td>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 uppercase">
                            Rejected
                        </span>
                      </td>
                      <td className="text-xs text-cgray">
                        <div className="font-semibold">
                          {new Date(ovr.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px]">
                          {new Date(ovr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="text-center py-10">No rejected transfers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-cgray">
              Showing page <b>{currentPage}</b> of <b>{totalPages || 1}</b>
            </p>
            <div className="flex gap-2">
              <button 
                className="btn btn-outline h-9 w-9 p-0! flex items-center justify-center disabled:opacity-30"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button 
                className="btn btn-outline h-9 w-9 p-0! flex items-center justify-center disabled:opacity-30"
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