import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
    const navigate = useNavigate();

    const goBack = () => navigate(-1); // Goes back to the previous page

    return (
        <div className="flex flex-col items-center justify-center h-screen text-center px-4">
            <h1 className="text-6xl! font-bold! text-red-500! mb-4">403</h1>
            <h2 className="text-2xl! font-semibold! text-gray-800! mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-8">
                Oops! You do not have permission to view this page.
            </p>
            
            <button 
                onClick={goBack} 
                className="btn btn-primary px-6 py-2 rounded-full w-[130px] h-[60px]"
            >
                Go Back
            </button>
        </div>
    );
};

export default Unauthorized;