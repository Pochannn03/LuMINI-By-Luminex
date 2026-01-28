import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import '../styles/landing.css'; 
import Logo from '../assets/lumini-logo.png';
/* 1. Import Menu and X icons for the mobile button */
import { ShieldCheck, Zap, BellRing, Menu, X } from 'lucide-react'; 

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 👈 2. New state for mobile menu

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative overflow-x-hidden font-poppins">
      
      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isMenuOpen ? "bg-white/90 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          
          {/* Logo */}
          <div className="text-2xl font-bold text-cbrand-blue tracking-tighter cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            LuMINI
          </div>

          {/* DESKTOP MENU (Hidden on mobile) */}
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="text-sm font-semibold text-clight hover:text-cbrand-blue transition-colors">Features</a>
            <a href="#about" className="text-sm font-semibold text-clight hover:text-cbrand-blue transition-colors">About</a>
            <a href="#contact" className="text-sm font-semibold text-clight hover:text-cbrand-blue transition-colors">Contact</a>
            <Link to="/login" className="ml-4 px-5 py-2 rounded-full bg-white/50 border border-blue-100 text-cbrand-blue font-bold text-sm hover:bg-blue-50 transition-colors">
              Sign In
            </Link>
          </div>

          {/* 3. MOBILE MENU BUTTON (Visible only on mobile) */}
          <button 
            className="md:hidden text-cdark p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* 4. MOBILE MENU DROPDOWN */}
        {/* This appears when isMenuOpen is true */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-6 flex flex-col gap-4 animate-in slide-in-from-top-5">
            <a 
              href="#features" 
              className="text-base font-semibold text-cdark py-2 border-b border-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="#about" 
              className="text-base font-semibold text-cdark py-2 border-b border-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </a>
            <a 
              href="#contact" 
              className="text-base font-semibold text-cdark py-2 border-b border-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </a>
            <Link 
              to="/login" 
              className="mt-2 w-full btn btn-primary py-3 rounded-xl text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Link>
          </div>
        )}
      </nav>

      {/* ... REST OF YOUR HERO AND SECTIONS (Keep them exactly as they were) ... */}
      <header className="hero-bg relative pt-32 pb-20 lg:pt-40 lg:pb-32 border-b border-blue-50/50">
          {/* ... Hero Content ... */}
           <div className="container mx-auto px-6">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            
            <div className="fade-in-up flex-1 text-center lg:text-left">
              <span className="inline-block py-1.5 px-4 rounded-full bg-blue-50 text-cbrand-blue text-xs font-bold uppercase tracking-wider mb-6 border border-blue-100">
                Ver 1.0 Release
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-cdark leading-tight mb-6 tracking-tight">
                Stay Connected with <br className="hidden lg:block"/>
                <span className="text-cbrand-blue">your School</span>
              </h1>
              <p className="text-lg text-clight mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Bridging the gap between parents, teachers, and guardians. 
                Experience seamless communication.
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link to="/login" className="btn btn-primary h-14 px-8 rounded-full text-lg font-medium shadow-lg hover:shadow-xl">
                  Get Started
                </Link>
                <a href="#about" className="btn btn-outline h-14 px-8 rounded-full bg-white/50 text-lg font-medium">
                  Learn More
                </a>
              </div>
            </div>

            <div className="flex-1 flex justify-center lg:justify-end relative">
              {/* Optional: A white glow behind the logo to make it pop off the doodles */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-white rounded-full blur-3xl opacity-60 -z-10"></div>
              <img src={Logo} alt="Lumini App" className="image-animation w-64 md:w-80 lg:w-[480px] h-auto object-contain drop-shadow-xl" />
            </div>
          </div>
        </div>
      </header>

      <div className="tech-bg relative">
         {/* ... Features, About, Footer ... */}
             <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-bottom from-white to-transparent pointer-events-none"></div>

        <section id="features" className="py-24 relative z-10">
  <div className="container mx-auto px-6">
    
    {/* Section Header */}
    <div className="text-center max-w-3xl mx-auto mb-16">
      <h2 className="text-3xl lg:text-4xl font-extrabold text-cdark mb-4">
        What we do for you
      </h2>
      <p className="text-lg text-clight">
        Simplifying school management with tools designed for speed and safety.
      </p>
    </div>

    {/* Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* CARD 1: Secure Identity */}
      <div className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
        {/* Icon Container - Blue Theme */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
          <ShieldCheck className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-bold text-cdark mb-3">Secure Identity</h3>
        <p className="text-clight leading-relaxed">
          Ensure only authorized guardians can pick up students with strict, real-time verification protocols.
        </p>
      </div>

      {/* CARD 2: Fast Check-in */}
      <div className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
        {/* Icon Container - Amber Theme */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
          <Zap className="w-8 h-8 text-amber-500 group-hover:text-white transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-bold text-cdark mb-3">Fast Check-in</h3>
        <p className="text-clight leading-relaxed">
          QR code integration allows for instant attendance logging, reducing wait times at the school gate.
        </p>
      </div>

      {/* CARD 3: Real-time Updates */}
      <div className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
        {/* Icon Container - Purple Theme */}
        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-600 transition-all duration-300">
          <BellRing className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-bold text-cdark mb-3">Real-time Updates</h3>
        <p className="text-clight leading-relaxed">
          Parents get notified instantly via SMS or App notification the moment their child arrives safely.
        </p>
      </div>

    </div>
  </div>
</section>

        <section id="about" className="py-24">
          <div className="container mx-auto px-6">
             <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="flex-1 w-full">
                  <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                    <div className="h-64 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                      <span className="text-cbrand-blue text-6xl opacity-50">Sample Pic</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-clight font-medium">
                      <span>Since 2025</span>
                      <span>Trusted by Schools eme muna</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-cbrand-blue font-bold tracking-wider uppercase text-sm mb-4">About LuMINI</h2>
                  <h3 className="text-3xl lg:text-4xl font-extrabold text-cdark mb-6">Redefining Student Safety</h3>
                  <p className="text-clight text-lg leading-relaxed mb-6">
                    LuMINI was born from a simple idea: parents shouldn't have to worry about their child's safety during school hours.
                  </p>
                  <ul className="space-y-4">
  <li className="flex items-center gap-3 text-cdark font-medium">
    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
    Easy for Schools to Adapt
  </li>
  <li className="flex items-center gap-3 text-cdark font-medium">
    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
    Parent-Friendly Interface
  </li>
  {/* 👇 UPDATED LINE */}
  <li className="flex items-center gap-3 text-cdark font-medium">
    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
    Streamlined Class Management
  </li>
</ul>
                </div>
             </div>
          </div>
        </section>

        <footer id="contact" className="bg-white pt-20 pb-10 border-t border-gray-200">
           {/* Footer content... */}
           <div className="container mx-auto px-6 text-center">
              <h2 className="text-3xl font-bold text-cdark mb-6">Ready to upgrade?</h2>
              <a href="#" className="btn btn-primary h-12 px-8 rounded-full mb-16">Contact Support</a>
              <div className="border-t border-gray-100 pt-8 text-sm text-gray-400">
                <p>© 2026 LuMINI Portal.</p>
              </div>
           </div>
        </footer>
      </div>

    </div>
  );
}