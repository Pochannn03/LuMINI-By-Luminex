import React, { useState } from 'react';
import axios from 'axios';

export default function AccountsAddModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: 'Student', // Default
    user_id_number: '' // e.g. Student ID or Employee ID
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Adjust URL to your actual backend endpoint
      const response = await axios.post('http://localhost:3000/api/users/register', formData, {
        withCredentials: true
      });

      if (response.data.success) {
        onSuccess(); // Refresh parent list
        onClose(); // Close modal
        setFormData({ full_name: '', email: '', username: '', password: '', role: 'Student', user_id_number: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">Create New Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Role</label>
            <select 
              name="role" 
              value={formData.role} 
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {/* ID Number */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Number</label>
            <input 
              type="text" 
              name="user_id_number" 
              placeholder="e.g. 2023-00123" 
              value={formData.user_id_number} 
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required 
            />
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 gap-4">
            <input 
              type="text" 
              name="full_name" 
              placeholder="Full Name" 
              value={formData.full_name} 
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
              required 
            />
             <input 
              type="email" 
              name="email" 
              placeholder="Email Address" 
              value={formData.email} 
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
              required 
            />
          </div>

          {/* Username & Password */}
          <div className="grid grid-cols-2 gap-4">
             <input 
              type="text" 
              name="username" 
              placeholder="Username" 
              value={formData.username} 
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
              required 
            />
             <input 
              type="password" 
              name="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
              required 
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}