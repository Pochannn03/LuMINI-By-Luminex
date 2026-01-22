import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import logo from '../../assets/lumini-logo.png' 
import '../../styles/auth/login.css'


export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate(); 
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 

    if (!formData.username.trim() && !formData.password.trim()) {
      setError("Please enter both username and password.");
      return;
    } else if (!formData.username.trim()) {
      setError("Please enter your username.");
      return;
    } else if (!formData.password.trim()){
      setError("Please enter your password.");
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/api/auth', formData, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true 
      });

      const data = response.data;

        if (data.user.role === "superadmin") {
          navigate('/superadmin/dashboard');
        } else if (data.user.role === "admin") {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard'); 
        }
        
    } catch (err) {
      console.error('Error:', err);
      setError('Server error. Please try again later.');
    }

  };

  return(
      <div className="min-h-screen w-full relative flex flex-col justify-end md:justify-center md:items-center">

        <div className="absolute top-0 left-0 w-full h-1/4 flex justify-center items-center pointer-events-none md:hidden">
          <img src={logo} alt="Lumini" className="mobile-logo md:block w-[60px] h-[60px] mx-auto mb-5 object-contain"/>
        </div>

        <div className="sign-in-form-container">
          <div className="w-[50px] h-1.5 mb-[30px] rounded-[10px] md:hidden"></div>

        <div className="sign-in-form-wrapper">
          <h1 className="after-word text-center w-full">
            Sign In
          </h1>

          {error && (
            <div className="text-red-500 text-sm text-center mb-4 mt-4">
              {error}
            </div>
          )}

          <form className="flex flex-col w-full mt-5" onSubmit={handleSubmit} >
            <label htmlFor="username" className="sr-only">
              Username
            </label>
              <input type="text" id="username" className="input-field" placeholder="Enter your username" value={formData.username} onChange={handleChange} />

            <label htmlFor="password" className="sr-only">
              Pasasword
            </label>
              <input type="password" id="password" className="input-field" placeholder="Enter your password" value={formData.password} onChange={handleChange} />

            <div className="flex justify-between items-center w-full px-2 py-0 mb-6 text-[13px]">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember-me" className="remember-me-checkbox"/>
                <label htmlFor="remember-me" className="remember-me-lbl">Remember me</label>
              </div>

                {/* Forgot password doesn't have interface yet remain # don't have Router*/}
                <a href="#" className="text-cbrand-blue no-underline font-medium" >Forgot Password</a>
            </div>

            <button type="submit" className="btn btn-primary w-full border-0 rounded-[27px] no-underline h-[52px] py-0 px-8 text-[16px] font-medium">
              Sign in
            </button>

            <div className="flex items-center w-full my-6 mx-0">
              <div className="grow h-px bg-[#eee]"></div>
              <p className="text-clight my-0 mx-4 text-center text-[14px]">or</p>
              <div className="grow h-px bg-[#eee]"></div>
            </div>

            <div className="text-clight text-center text-[13px] mb-1.5">
              Don't have an account?
            </div>

            <Link to="/register" className="btn btn-outline mt-4 h-[52px] py-0 px-8 rounded-[27px] text-[16px] font-medium">Sign Up</Link>

          </form>


      </div>
    </div>
  </div>
  )
}