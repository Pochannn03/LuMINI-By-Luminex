import React from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/guardian-registration.css'


export default function GuardianRegistration() {
  return (
    <div className='bg-white relative flex flex-col items-center p-10 ronded-[24px] w-[90%] max-w-[500px] my-10 mx-0 z-10 opacity-0 sm:p-[25px]'>
      <h1 className='mb-2.5 text-left'>
        Enter Invitation Code
      </h1>
      <p className=''>
        Enter the invitation code provided by your child's teacher to create your account.
      </p>
    </div>
  );
}
