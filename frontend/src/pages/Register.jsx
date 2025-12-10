import React from "react";
import { Link } from 'react-router-dom';
import '../styles/register.css';

export default function Register() {
  return (
    <div className="main-container">
      <div className="selection-wrapper">
        <h1 className="registration-header-text">Register as</h1>

        <div className="cards-container">
          <Link to='/parentregister' className="card-wrapper">
            <div className="svg-wrapper">
              <div className="svg-icon-holder parent-icon"></div>
            </div>
            <span className="card-label">Parent</span>
          </Link>

          <a
            href="../guardian/guardian_registration.html"
            className="card-wrapper"
          >
            <div className="svg-wrapper">
              <div className="svg-icon-holder guardian-icon"></div>
            </div>
            <span className="card-label">Guardian</span>
          </a>

          <a
            href="../teacher/teacher_registration.html"
            className="card-wrapper"
          >
            <div className="svg-wrapper">
              <div className="svg-icon-holder teacher-icon"></div>
            </div>
            <span className="card-label">Teacher</span>
          </a>
        </div>

        <div className="redirect-sign-in-container">
          <p className="label-already-acc">Already have an account?</p>
          <Link to="/login" className="login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
