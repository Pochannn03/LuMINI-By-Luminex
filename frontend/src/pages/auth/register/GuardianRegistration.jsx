import React from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/guardian-registration.css'


export default function GuardianRegistration() {

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">

      <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]'>
        <h1 className='mb-2.5 text-left'>
          Enter Invitation Code
        </h1>
        <p className='text-clight text-left text-[14px]'>
          Enter the invitation code provided by your child's teacher to create your account.
        </p>

        <div className='flex justify-between gap-2 w-full my-[30px] mb-0 sm:gap-[5px]'>
          <input type="text" className='code-box' maxLength="1"/>
          <input type="text" className='code-box' maxLength="1"/>
          <input type="text" className='code-box' maxLength="1"/>
          <input type="text" className='code-box' maxLength="1"/>
          <input type="text" className='code-box' maxLength="1"/>
          <input type="text" className='code-box' maxLength="1"/>
        </div>

        <button type='submit' className='btn btn-primary button flex flex-none justify-center items-center w-full h-12 border-none mt-7 rounded-[30px]' id='submitCodeBtn'>
          Submit
        </button>

        <div className='flex flex-row justify-center items-center mt-[15px] border-none p-0 gap-1.5 w-full'>
          <span className='text-clight text-[14px]'>
            Already have an account?
          </span>
          <Link to='/login' className='login-link whitespace-nowrap'>Sign In</Link>
        </div>

        <div>

        </div>

      </div>

    </div>
  );
}
