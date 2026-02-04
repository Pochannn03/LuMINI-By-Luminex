import React from 'react';

export default function FormInputRegistration({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  error, 
  required = false,
  readOnly = false,
  className = ''
}) {

  const inputClassName = `registration-input ${className} ${
    error ? '!border-red-500 !bg-red-50' : ''
  } ${readOnly ? 'cbackground-gray cursor-not-allowed' : ''}`;
  
  return (
    <div className='flex flex-col w-full mb-1'>
    
      {/* The Label */}
      {label && (
        <label htmlFor={name} className='text-cdark text-[13px] font-semibold mb-2'>
          {label}
          {required && <span className='text-cbrand-blue ml-1 text-[12px]'>*</span>}
          {readOnly && <span className='text-cbrand-blue ml-1 text-[12px]'></span>}
        </label>
      )}

      {/* The Input Box */}
      <input
        type={type}
        name={name}
        id={name}
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />

      {/* The Error Message */}
      {error && (
        <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block">
          {error}
        </span>
      )}
    </div>
  );
}