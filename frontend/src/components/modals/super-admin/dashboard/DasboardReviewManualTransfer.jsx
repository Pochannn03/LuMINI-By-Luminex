import React from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';

export function DashboardReviewOverrideModal({ onView, isClose, ovr, onSuccess }) {
  if (!onView || !ovr) return null;

  const handleAction = async (actionType) => {
    const endpoint = actionType === 'approve' ? 'approve' : 'reject';
    try {
      const { data } = await axios.patch(
        `http://localhost:3000/api/transfer/override/${endpoint}/${ovr._id}`,
        {},
        { withCredentials: true }
      );
      if (data.success) {
        onSuccess(data.msg);
        isClose();
      }
    } catch (err) {
      alert(err.response?.data?.msg || `${actionType} failed`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-cdark">Review Manual Transfer</h2>
            <p className="text-sm text-cgray">Please verify the identity evidence provided by the teacher.</p>
          </div>
          <button onClick={isClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Student</label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">child_care</span>
                  </div>
                  <span className="font-semibold text-cdark">
                    {ovr.student_details?.first_name} {ovr.student_details?.last_name}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Guardian / Presenter</label>
                <p className="text-cdark font-medium mt-1">{ovr.user_name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ovr.is_registered_guardian ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {ovr.is_registered_guardian ? 'REGISTERED GUARDIAN' : 'GUEST / UNAUTHORIZED'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Purpose</label>
                <div className={`mt-1 flex items-center gap-2 font-bold ${ovr.purpose === 'Pick up' ? 'text-orange-600' : 'text-blue-600'}`}>
                   <span className="material-symbols-outlined text-[20px]">
                    {ovr.purpose === 'Pick up' ? 'logout' : 'login'}
                   </span>
                   {ovr.purpose}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Requested At</label>
                <p className="text-cdark text-sm mt-1">
                  {new Date(ovr.created_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          </div>

          {/* ID Photo Evidence Section */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">ID Photo Evidence</label>
            {ovr.id_photo_evidence ? (
              <div className="relative group rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 aspect-video flex items-center justify-center">
                <img 
                  src={`http://localhost:3000/${ovr.id_photo_evidence.replace(/\\/g, '/')}`} 
                  alt="Identity Evidence" 
                  className="w-full h-full object-contain"
                />
                <a 
                  href={`http://localhost:3000/${ovr.id_photo_evidence}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm text-xs font-bold flex items-center gap-2 hover:bg-white transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View Full Resolution
                </a>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 text-center">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">no_photography</span>
                <p className="text-slate-500 text-sm italic">No photo evidence was uploaded for this record.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            onClick={() => handleAction('reject')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
          >
            Discard Record
          </button>
          <button 
            onClick={() => handleAction('approve')}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            Approve & Record
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}