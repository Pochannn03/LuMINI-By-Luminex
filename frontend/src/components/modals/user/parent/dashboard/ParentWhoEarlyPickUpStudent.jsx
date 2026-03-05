import React from 'react';

export default function ParentWhoEarlyPickUpStudent({ isOpen, onClose, onSelect, people, getImageUrl, loading, currentUser }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[modalPop_0.3s_ease-out]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Pickup Authorization</h2>
            <p className="text-xs text-slate-500 mt-1">Who will be arriving at the school gate?</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-4">
            
            {/* OPTION 1: THE PARENT THEMSELVES */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Primary Parent</span>
              
              <button
                onClick={() => onSelect(currentUser)}
                className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group text-left"
              >
                <img 
                  src={getImageUrl(currentUser?.profile_picture || currentUser?.profilePicture || currentUser?.user?.profile_picture)} 
                  alt="Me"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = "../../../assets/placeholder_image.jpg"; 
                  }} 
                />
                
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700 text-[15px] group-hover:text-blue-600">
                    {currentUser?.first_name || currentUser?.firstName} {currentUser?.last_name || currentUser?.lastName} (Me)
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Parent</span>
                </div>
                
                <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-blue-500">
                  chevron_right
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">OR AUTHORIZE OTHERS</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* OPTION 2: AUTHORIZED GUARDIANS */}
            <div className="flex flex-col gap-2">   
              {loading ? (
                <div className="flex items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400 mr-3"></div>
                  <span className="text-sm text-slate-500">Checking authorization list...</span>
                </div>
              ) : people.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {people
                    .filter(p => p.user_id !== currentUser?.user_id) 
                    .map((person) => (
                      <button
                        key={person.user_id}
                        onClick={() => onSelect(person)}
                        className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all group text-left"
                      >
                        <img 
                          src={getImageUrl(person.profile_picture)} 
                          alt={person.first_name}
                          className="w-10 h-10 rounded-full object-cover grayscale-[0.5] group-hover:grayscale-0"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[15px] group-hover:text-blue-600">
                            {person.first_name} {person.last_name}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">{person.relationship}</span>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-blue-500">
                          chevron_right
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                   <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">person_off</span>
                   <p className="text-xs text-slate-400">No other authorized persons linked to this student.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}