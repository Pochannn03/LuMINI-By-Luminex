import React from "react";
import { Link } from 'react-router-dom';
import '../styles/landing.css';
import Logo from '../assets/lumini-logo.png';


export default function Landing() {
  return (
    <>
      <header className="flex flex-col justify-center items-center pb-[60px] min-h-[80vh]">
        <nav className="relative flex justify-between items-center pt-[25px] w-[90%] max-w-[1200px] z-10 mx-auto mb-2.5">
          <span className="title text-2xl">
            LuMINI
          </span>

          <div className="flex gap-[15px] lg:gap-[30px]">
            <a href="#" className="link lg:text-[15px]">About</a>
            <a href="#" className="link lg:text-[15px]">Contact</a>
          </div>
        </nav>

        <div className="fade-in-up relative flex flex-col-reverse items-center gap-10 mt-10 w-[90%] max-w-[1200px] mx-auto z-2 lg:flex-row lg:justify-between lg:text-left lg:mt-0">
          <div className="text-cdark text-center max-w-[600px] lg:items-start lg:text-left lg:w-1/2">
            <span className="background-custom text-cbrand-blue inline-block py-[8px] px-[16px] rounded-full text-[12px] font-bold uppercase tracking-wider mb-[24px]">Ver 1.0 Release</span>

            <h1 className="text-cdark text-[36px] font-extrabold leading-tight mb-5 lg:text-[48px]">
              Stay Connected with your School
            </h1>

            <p className="text-cdark text-[16px] leading-relaxed mb-8 lg:text-[18px]">
              Bridging the gap between parents, teachers, and guardians.
              Experience seamless communication with simple taps.
            </p>

            <div className="flex justify-center w-full gap-[15px]">
              <Link to="/login" className="btn btn-primary">Sign In</Link>
              <Link to="/register" className="btn btn-outline">Create Account</Link>
            </div>
          </div>

          <div className="flex justify-center items-center w-full h-auto lg:w-[45%] lg:justify-end">
            <img src={Logo} alt="Lumini App" className="image-animation block w-[200px] h-auto lg:w-[380px]" />
          </div>
        </div>
      </header>

      <section className="py-20 bg-white text-center">
        <div classNaame="w-[90%] max-w-[1200px] mx-auto">
          <div>
            <h2 className="text-cbrand-blue font-extrabold text-[28px] mb-2.5">
              What we do for you
            </h2>
            <p className="text-clight mb-[50px]">
              Simplifying school management one check-in at a time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 w-11/12 max-w-6xl mx-auto lg:grid-cols-3">
            <div className="feature-card">
              <div class="text-[40px] mb-5">🛡️</div>
                <h3 className=".text-cdark font-bold text-[14px] mb-2.5">
                  Secure Identity
                </h3>
                <p className="text-clight leading-relaxed text-[14px]">
                  Ensure only authorized guardians can pick up students.
                </p>
            </div>
            <div className="feature-card">
              <div class="text-[40px] mb-5">⚡</div>
                <h3 className=".text-cdark font-bold text-[14px] mb-2.5">
                  Fast Check-in
                </h3>
                <p className="text-clight leading-relaxed text-[14px]">
                  QR code integration allows for instant attendance logging.
                </p>
            </div>
            <div className="feature-card">
              <div class="text-[40px] mb-5">📱</div>
                <h3 className=".text-cdark font-bold text-[14px] mb-2.5">
                  Real-time Updates
                </h3>
                <p className="text-clight leading-relaxed text-[14px]">
                  Parents get notified instantly when their child arrives safely.
                </p>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
