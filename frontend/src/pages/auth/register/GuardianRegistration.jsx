import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/guardian-registration.css'


export default function GuardianRegistration() {
  // Phase of Registration //
  const [phase, setPhase] = useState('invitation');

  // Validation of User to Register //
  const [opacity, setOpacity] = useState(1);
  const [code, setCode] = useState(Array(6).fill(""));

  // Step of Registration //
  const [currentStep, setCurrentStep] = useState(0);

  const inputRefs = useRef([]); 

  const handleCodeChange = (e, index) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };
  
  const handleSubmitCode = () => {
    if (code.join("").length === 6) {
      setOpacity(0); // Fade out
      setTimeout(() => {
        setPhase('registration'); // Switch View
        setTimeout(() => setOpacity(1), 50); // Fade in
      }, 300);
    } else {
      alert("Please enter a valid 6-character code.");
    }
  };

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">
      
      {phase === 'invitation' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]' 
        style={{ opacity: opacity }}>
          <h1 className='mb-2.5 text-left'>
            Enter Invitation Code
          </h1>
          <p className='text-clight text-left text-[14px]'>
            Enter the invitation code provided by your child's teacher to create your account.
          </p>

          <div className='code-inputs-wrapper flex justify-between gap-2 w-full my-[30px] mb-0 sm:gap-[5px]'>
            {code.map((data, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength="1"
                className="code-box"
                value={data}
                onChange={e => handleCodeChange(e, index)} // Corrected Event passing
                onKeyDown={e => handleCodeKeyDown(e, index)} 
                onFocus={e => e.target.select()}
              />
            ))}
          </div>

          <button type='submit' className='btn btn-primary button flex flex-none justify-center items-center w-full h-12 border-none mt-7 rounded-[30px]' id='submitCodeBtn' onClick={handleSubmitCode}>
            Submit
          </button>

          <div className='flex flex-row justify-center items-center mt-[15px] border-none p-0 gap-1.5 w-full'>
            <span className='text-clight text-[14px]'>
              Already have an account?
            </span>
            <Link to='/login' className='login-link whitespace-nowrap'>Sign In</Link>
          </div>
        </div>
        )
      }

      {phase === 'registration' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]'
        style={{ opacity: opacity }}>
          <h1 className='text-left w-full mb-2.5'>
            Create Account
          </h1>
          <p className='w-full mb-[25px] font-normal text-left'>
            Please fill out the form to create your guardian account.
          </p>

          <div className='inline-block py-1.5 px-3.5 rounded-[50px] mb-[25px]'>
            <span className='text-cbrand-blue text-[11px] font-bold uppercase'>Step {currentStep + 1} of 4</span>
          </div>

          <form className="flex flex-col w-full" id="mainRegistrationForm" action="#" method="POST">

            <div>
              <p className='border-bottom-custom'>
              Account Setup
              </p>
              <div className='flex flex-col w-full mb-5'>
                <label htmlFor="username" className='text-[13px] font-semibold mb-2'>
                  Username
                    <span className='text-cbrand-blue ml-1 text-[12px]'>
                      *
                    </span>
                </label>
                <input type="text" name="username" className='registration-input' placeholder='shizuka_312' />
              </div>

              <div className='flex flex-col w-full mb-5'>
                <label htmlFor="password" className='text-[13px] font-semibold mb-2'>
                  Password
                    <span className='text-cbrand-blue ml-1 text-[12px]'>
                      *
                    </span>
                </label>
                <input type="password" name="password" className='registration-input' placeholder='******' />
              </div>

              <div className='flex flex-col w-full mb-5'>
                <label htmlFor="confirm-password" className='text-[13px] font-semibold mb-2'>
                  Confirm Password
                    <span className='text-cbrand-blue ml-1 text-[12px]'>
                      *
                    </span>
                </label>
                <input type="password" name="confirm-password" className='registration-input' placeholder='******' />
              </div>
            </div>

          </form>
          
        </div>
        )
      }


    </div>
  );
}
