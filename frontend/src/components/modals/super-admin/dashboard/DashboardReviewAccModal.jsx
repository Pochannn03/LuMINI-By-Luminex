import React from "react";
import { createPortal } from 'react-dom';
import FormInputRegistration from '../../../FormInputRegistration';

export function DashboardReviewAccModal({ onView, isClose, tch }) {

  if(!onView) return null;
  const photoUrl = tch.profile_picture 
    ? `http://localhost:3000/${tch.profile_picture}` 
    : "https://via.placeholder.com/150";

  // Format Date for display
  const joinedDate = new Date(tch.created_at).toLocaleDateString();
  const reviewInputStyle = "!bg-slate-50 !text-slate-600 !border-slate-200";

  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined purple-icon text-[24px]">verified_user</span>
              <h2 className="text-[18px] m-0">Review Application</h2>
            </div>
          </div>

        <div className="p-6 overflow-y-auto text-center">
          <img 
            src={photoUrl} 
            alt="Profile" 
            className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-md"
          />
          <h3 className="mb-1 text-[20px]!">{tch.first_name} {tch.last_name}</h3> 
          <p className="text-cgray text-[14px]! mb-6">@{tch.username}</p> 

          <div className="text-left mb-5">
            <h4 className="text-cprimary-blue text-[13px] mb-2 font-bold uppercase">Contact Information</h4>
            <div className="flex flex-colflex-1 gap-1.5 mb-4 text-left">
              <FormInputRegistration 
                label="Email Address"
                name="email"
                value={tch.email || ""}
                readOnly={true}
                className={reviewInputStyle}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
                <FormInputRegistration 
                    label="Phone Number"
                    name="phone"
                    value={tch.phone_number || ""}
                    readOnly={true}
                    className={reviewInputStyle}
                 />
              </div>
              <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
                <FormInputRegistration 
                    label="Date Joined"
                    name="date"
                    value={joinedDate}
                    readOnly={true}
                    className={reviewInputStyle}
                 />
              </div>
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-cprimary-blue text-[13px] mb-2 font-bold uppercase">
              Address Details
            </h4>
            <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
              <FormInputRegistration 
                label="Full Address"
                name="address"
                value={tch.address || ""}
                readOnly={true}
                className={reviewInputStyle}
              />
            </div>
          </div>
        </div>
            
        <div className="modal-footer">
          <button className="btn-modal close" id="closeReviewBtn" onClick={isClose}>Close</button>
          <div className="flex flex-1"></div>
          <button className="btn-modal reject" id="modalRejectBtn">
            <span className="material-symbols-outlined text-[18px]">close</span>
            Reject
          </button>
          <button className="btn-modal approve" id="modalApproveBtn">
            <span className="material-symbols-outlined text-[18px]">check</span>
            Approve
          </button>
        </div>
        </div>
      </div>
    </>,
    document.body
  );
}