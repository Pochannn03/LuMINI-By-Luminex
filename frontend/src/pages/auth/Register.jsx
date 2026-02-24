import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/auth/register.css';

export default function Register(){
  return(
    <div className="wave relative flex w-full justify-center items-center min-h-screen p-5 z-10 overflow-hidden">
      <div className="relative flex w-full justify-center items-center min-h-screen p-5 z-10 overflow-hidden">
        <div className="selection-wrapper max-w-[480px] lg:max-w-[550px] lg:p-[60px]">
          <h1 className="text-[32px] text-center pb-5 w-full font-bold">Register as</h1>

          {/* Restored to just "cards-container" so your CSS handles the alignment */}
          <div className="cards-container">

            <Link to={"/register/parent"} className="card-wrapper lg:h-40 lg:w-40">
              <div className="svg-wrapper">
                <div className="svg-icon-holder parent-icon">
                </div>
              </div>
              <span className="text-cdark text-[14px] font-medium text-center leading-tight">
                Parent
              </span>
            </Link>

            <Link to={"/register/teacher"} className="card-wrapper lg:h-40 lg:w-40 ">
              <div className="svg-wrapper">
                <div className="svg-icon-holder teacher-icon">
                </div>
              </div>
              <span className="text-cdark text-[14px] font-medium text-center">Teacher</span>
            </Link>

          </div>

          <div className="flex justify-center items-center w-full pt-5 mt-2.5">
            <span className="text-clight text-[14px] mr-1.5">
              Already have an account?
            </span>
            <Link to="/login" className="login-link">Sign In</Link>
          </div>

        </div>
      </div>
    </div>
  )
}