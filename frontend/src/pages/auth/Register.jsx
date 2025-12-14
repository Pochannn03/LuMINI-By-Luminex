import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/register.css';



export default function Register(){
  return(
    <div className="register-page-wrapper relative flex w-full justify-center items-center min-h-screen p-5 z-10 overflow-hidden">
      <div className="relative flex w-full justify-center items-center min-h-screen p-5 z-10 overflow-hidden">
        <div className="selection-wrapper max-w-[480px] lg:max-w-[650px] lg:p-[60px]">
          <h1 className="text-[32px] text-center pb-5">Register as</h1>

          <div className="cards-container">

            <Link to={"#"} className="card-wrapper lg:h-40 lg:w-40">
              <div className="svg-wrapper">
                <div className="svg-icon-holder parent-icon">
                </div>
              </div>
              <span className="text-cdark text-[15px] font-medium">Parent</span>
            </Link>

            <Link to="/register/guardian" className="card-wrapper lg:h-40 lg:w-40 ">
              <div className="svg-wrapper">
                <div className="svg-icon-holder guardian-icon">
                </div>
              </div>
              <span className="text-cdark text-[15px] font-medium">Guardian</span>
            </Link>

            <Link to={"#"} className="card-wrapper lg:h-40 lg:w-40 ">
              <div className="svg-wrapper">
                <div className="svg-icon-holder teacher-icon">
                </div>
              </div>
              <span className="text-cdark text-[15px] font-medium">Teacher</span>
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