import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import '../styles/login.css';


export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the page from reloading

    try {
      const response = await fetch('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // IMPORTANT: This allows the browser to save the session cookie
        credentials: 'include', 
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        console.log("Login Successful");
        navigate('/parent-dashboard'); // Redirect user after success
      } else {
        console.error("Login Failed");
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="main-container">
      <div className="mobile-logo-container">
        <img src="../assets/lumini-logo.png" alt="Lumini" className="mobile-logo" />
      </div>

      <div className="sign-in-form-container">
        <div className="sheet-handle"></div>

        <div className="sign-in-form-wrapper">
          <h1 className="header-text">Sign In</h1>

          <form className="sign-in-form" onSubmit={handleSubmit}>
            <label htmlFor="username" className="sr-only">Username</label>
            <input
              type="text"
              id="username"
              className="input-field"
              placeholder="Enter your username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label htmlFor="password" className="sr-only">Password</label>
            <input
              type="password"
              id="password"
              className="input-field"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="horizontal-container forgotpass-container">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="remember-me"
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
