import React, { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react'; 
import '../../styles/login.css';

import secureBgImage from '../../assets/Secure.jpg'; 
import fastBgImage from '../../assets/CheckIns.jpg';  
import updatesBgImage from '../../assets/Updates.jpg';

export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate(); 
  const { login, user, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); 

  // --- SLIDER STATE & LOGIC ---
  const [featureIndex, setFeatureIndex] = useState(0);

  const features = [
    {
      id: "secure",
      title: "Secure Identity",
      text: "Ensure only authorized guardians can pick up students with strict verification protocols.",
      bgImage: secureBgImage, 
    },
    {
      id: "fast",
      title: "Fast Check-in",
      text: "QR code integration allows for instant attendance logging, reducing wait times.",
      bgImage: fastBgImage,
    },
    {
      id: "updates",
      title: "Real-time Updates",
      text: "Parents get notified instantly via SMS or App notification the moment their child arrives.",
      bgImage: updatesBgImage,
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % features.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [features.length]);

  useEffect(() => {
    if (user && !loading) {
      if (user.role === "superadmin") {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (user.role === "admin") {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if(error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth', formData, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true 
      });

      const data = response.data;
      login(data.user);

        if (data.user.role === "superadmin") {
          navigate('/superadmin/dashboard');
        } else if (data.user.role === "admin") {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard'); 
        }
        
    } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message); 
      } else {
        if (response.status === 401) {
          setError("Invalid Credentials");
        } else {
          setError(data.message || 'Login failed');
        }
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-white font-poppins overflow-hidden">
      
      {/* ---------------- TOP/LEFT SECTION: SLIDER ---------------- */}
      <div 
        className="
          w-full h-[40vh] relative flex items-center overflow-hidden transition-all duration-1000 ease-in-out
          justify-start 
          lg:h-full lg:w-1/2 lg:justify-center
          bg-[length:180%] lg:bg-cover
        "
        style={{
          backgroundImage: `url(${features[featureIndex].bgImage})`,
          backgroundPosition: 'center'
        }}
      >
        {/* Content Wrapper */}
        <div className="
            relative z-10 w-full max-w-xl pb-12 
            pl-10 pr-8 text-left 
            lg:px-16 lg:text-center lg:pb-0
        ">
            
            <h3 className="text-3xl lg:text-5xl font-extrabold text-[#2c3e50] mb-3 lg:mb-6 transition-all duration-500 tracking-tight">
                {features[featureIndex].title}
            </h3>
            
            <p className="
                text-[#2c3e50] text-sm lg:text-xl leading-relaxed font-semibold transition-all duration-500 max-w-sm
                mx-0 
                lg:mx-auto
            ">
                {features[featureIndex].text}
            </p>
            
            <div className="
                flex gap-2.5 mt-6 
                justify-start 
                lg:mt-12 lg:justify-center
            ">
              {features.map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setFeatureIndex(idx)}
                  className={`h-2 lg:h-2.5 rounded-full transition-all duration-500 ease-in-out shadow-sm ${
                    idx === featureIndex 
                    ? `w-8 lg:w-12 bg-[var(--brand-blue)]` 
                    : 'w-2 lg:w-2.5 bg-gray-400 hover:bg-gray-600'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
        </div>
      </div>

      {/* ---------------- BOTTOM/RIGHT SECTION: FORM ---------------- */}
      <div className="
        w-full flex-1 bg-white 
        rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] -mt-8 relative z-20 
        lg:w-1/2 lg:h-full lg:rounded-none lg:shadow-none lg:mt-0 lg:flex lg:flex-col lg:justify-center
        overflow-y-auto lg:overflow-hidden
      ">
        
        {/* Inner Content */}
        <div className="w-full max-w-md lg:max-w-xl mx-auto px-8 pt-10 pb-12 lg:p-16 lg:flex lg:flex-col lg:justify-center min-h-full">
            
            {/* Header */}
            <div className="mb-8 lg:mb-12 text-left">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-[#2c3e50] mb-2 lg:mb-4 tracking-tight">Sign In</h2>
              <p className="text-gray-500 text-base lg:text-xl">Welcome back! Please enter your details.</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-shake">
                <span className="font-bold">!</span> {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-8 flex-col justify-start">
              
              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm lg:text-base font-semibold text-gray-700 ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-blue)] transition-colors">
                    <User size={22} />
                  </div>
                  <input 
                    type="text" 
                    id="username" 
                    className="w-full h-[50px] lg:h-[64px] pl-14 pr-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[var(--brand-blue)] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-base lg:text-lg text-gray-700 placeholder-gray-400"
                    placeholder="Enter your username"
                    value={formData.username} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label htmlFor="password" className="text-sm lg:text-base font-semibold text-gray-700">Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-blue)] transition-colors">
                    <Lock size={22} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    className="w-full h-[50px] lg:h-[64px] pl-14 pr-14 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[var(--brand-blue)] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-base lg:text-lg text-gray-700 placeholder-gray-400"
                    placeholder="••••••••"
                    value={formData.password} 
                    onChange={handleChange} 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember-me" className="w-4 h-4 lg:w-5 lg:h-5 rounded text-[var(--brand-blue)] focus:ring-[var(--brand-blue)] border-gray-300"/>
                  <label htmlFor="remember-me" className="text-sm lg:text-base text-gray-500 cursor-pointer select-none">Remember me</label>
                </div>
                <a href="#" className="text-sm lg:text-base font-semibold text-[var(--brand-blue)] hover:text-blue-600 transition-colors">
                  Forgot Password?
                </a>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-[50px] lg:h-[64px] bg-[var(--brand-blue)] hover:bg-[#2c8ac4] text-white rounded-2xl font-bold text-lg lg:text-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Register Link */}
            <p className="mt-8 lg:mt-10 text-center text-sm lg:text-lg text-gray-500">
              New to LuMINI?{" "}
              <Link to="/register" className="font-semibold text-[var(--brand-blue)] hover:text-blue-700 transition-colors">
                Create an Account
              </Link>
            </p>
        </div>
      </div>

    </div>
  );
}