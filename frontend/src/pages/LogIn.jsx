import React from "react";
import { Link } from 'react-router-dom';
import '../styles/login.css';


export default function Login() {
  return (
    <div className="main-container">
      <div className="mobile-logo-container">
        <img src="../assets/lumini-logo.png" alt="Lumini" className="mobile-logo" />
      </div>

      <div className="sign-in-form-container">
        <div className="sheet-handle"></div>

        <div className="sign-in-form-wrapper">
          <h1 className="header-text">Sign In</h1>

          <form className="sign-in-form" action="#" method="POST">
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="input-field"
              placeholder="Enter your username"
              required
            />

            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="input-field"
              placeholder="Enter your password"
              required
            />

            <div className="horizontal-container forgotpass-container">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  className="remember-me-checkbox"
                />
                <label htmlFor="remember-me" className="remember-me-lbl">
                  Remember me
                </label>
              </div>

              <a href="#" className="forgot-password-link">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="button confirm-button">
              Sign In
            </button>

            <div className="divider-container">
              <div className="line"></div>
              <p className="or-text">or</p>
              <div className="line"></div>
            </div>

            <div className="register-prompt">Don't have an account?</div>

            <Link to="/register" className="button register-button">
              Register
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
