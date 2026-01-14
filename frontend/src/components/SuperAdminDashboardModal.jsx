import React from "react";
import { Link,  } from 'react-router-dom';
import '../../styles/sidebar.css';

export default function SuperAdminDashbooardModal() {
  return (
    <>
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined purple-icon text-[24px]">verified_user</span>
              <h2 className="text-[18px] m-0">Review Application</h2>
            </div>
          </div>

        <div className="p-6 overflow-y-auto text-center">
          <img src="#" alt="#" /> {/* Img of Teacher's Newly Created Account */}
          <h3 className="mb-1 text-[20px]">--</h3> {/* Name of Teacher's Newly Created Account */}
          <p className="text-cgray text-[14px] mb-6">@--</p> {/* Username of Teacher's Newly Created Account */}
          

          <div className="text-left mb-5">
            <h4 className="text-cprimary-blue text-[13px] mb-2.5 font-bold uppercase">Contact Information</h4>
            <div className="flex flex-colflex-1 gap-1.5 mb-4 text-left">
              <label htmlFor="reviewEmail">Email Address</label>
              <input type="text" id='reviewEmail' className="form-input" /> {/* Email of Teacher's Newly Created Account */}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
                <label htmlFor="reviewPhone">Phone Number</label>
                <input type="text" id='reviewPhone' className="form-input" read-only/> {/* Phone Number of Teacher's Newly Created Account */}
              </div>
              <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
                <label htmlFor="reviewDate">Date Joined</label>
                <input type="text" id='reviewDate' className="form-input" read-only/> {/* Date joined of Teacher's Newly Created Account */}
              </div>
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-cprimary-blue text-[13px] mb-2.5 front-bold uppercase">
              Address Details
            </h4>
            <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
              <label htmlFor="reviewStreet">Street Address</label>
              <input type="text" id='reviewStreet' className="form-input" read-only/> {/* Street of Teacher's Newly Created Account */}
            </div>
            <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
              <label htmlFor="reviewBarangay">Barangay</label>
              <input type="text" id='reviewBarangay' className="form-input" read-only/> {/* Street of Teacher's Newly Created Account */}
            </div>
            <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
              <label htmlFor="reviewCity">City</label>
              <input type="text" id='reviewCity' className="form-input" read-only/> {/* Street of Teacher's Newly Created Account */}
            </div>
            <div className="flex flex-col flex-1 gap-1.5 mb-4 text-left">
              <label htmlFor="reviewZip">Zip Code</label>
              <input type="text" id='reviewZip' className="form-input" read-only/> {/* Street of Teacher's Newly Created Account */}
            </div>
          </div>
        </div>
            
        <div className="modal-footer">
          <button className="btn-modal close" id="closeReviewBtn">Close</button>
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
    </>
  );
}