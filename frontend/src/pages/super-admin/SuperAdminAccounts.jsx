import React, { useState, useEffect, useCallback } from "react";
// import axios from 'axios'; 
import '../../styles/super-admin/class-management.css'; 
import NavBar from "../../components/navigation/NavBar";

// Import Modals
import AccountsEditModal from "../../components/modals/super-admin/accounts/AccountsEditModal";
import AccountsDeleteModal from "../../components/modals/super-admin/accounts/AccountsDeleteModal";

// --- DUMMY DATA ---
const DUMMY_ACCOUNTS = [
  {
    _id: "101",
    role: "Admin",
    full_name: "Principal Skinner",
    user_id_number: "ADM-001",
    username: "principal_skinner",
    is_active: true,
    last_login: "2023-10-26T08:30:00.000Z"
  },
  {
    _id: "102",
    role: "Teacher",
    full_name: "Edna Krabappel",
    user_id_number: "TCH-055",
    username: "ms_krabappel",
    is_active: true,
    last_login: "2023-10-25T14:15:00.000Z"
  },
  {
    _id: "104",
    role: "Student",
    full_name: "Bart Simpson",
    user_id_number: "STD-888",
    username: "el_barto",
    is_active: false, 
    last_login: "2023-09-01T09:00:00.000Z"
  },
  {
    _id: "106",
    role: "Parent",
    full_name: "Homer Simpson",
    user_id_number: "PRT-101",
    username: "mr_plow",
    is_active: true,
    last_login: "2023-10-28T18:00:00.000Z"
  }
];

export default function SuperAdminAccounts() {
  // MODAL STATES
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  // DATA STATES
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All"); 

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 600));
      setAccounts(DUMMY_ACCOUNTS);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // HANDLERS
  const handleEdit = (account) => {
    setSelectedAccount(account);
    setIsEditAccountModalOpen(true);
  };

  const handleDelete = (account) => {
    setSelectedAccount(account);
    setIsDeleteAccountModalOpen(true);
  };

  // HELPER: Get Initials for Avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // HELPER: Get Badge Color based on Role
  const getRoleBadgeStyle = (role) => {
    switch(role) {
      case 'Admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Teacher': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Student': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Parent': return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole = roleFilter === "All" || acc.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesSearch = 
      acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      acc.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        
        {/* HEADER */}
        <div className="superadmin-banner mb-6">
          <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">Accounts Directory</h1>
          <p className="text-[white]! opacity-80 text-[15px]! m-0">View and manage registered users.</p>
        </div>

        <div className="flex flex-col gap-6 max-w-[1200px] m-auto">
          
          {/* SEARCH & FILTER BAR */}
          <div className="card p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white sticky top-0 z-10">
            <div className="search-bar-small flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 w-full md:max-w-md">
              <span className="material-symbols-outlined text-gray-400">search</span>
              <input 
                type="text" 
                placeholder="Search by name or username..." 
                className="bg-transparent border-none outline-none w-full text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* ✅ FIXED SELECT DROPDOWN */}
            <div className="relative w-full md:w-auto">
              <select 
                className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:border-blue-500 block pl-3 pr-10 py-2.5 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admins</option>
                <option value="Teacher">Teachers</option>
                <option value="Student">Students</option>
                <option value="Parent">Parents</option>
              </select>
              {/* Custom Arrow Icon positioned absolutely */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>

          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="p-12 text-center text-cgray bg-white rounded-xl border border-gray-100 shadow-sm">
              <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
              <p>Loading Accounts...</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && filteredAccounts.length === 0 && (
            <div className="p-12 text-center text-cgray bg-white rounded-xl border border-gray-100 shadow-sm">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
              <p>No accounts found.</p>
            </div>
          )}

          {/* --- DESKTOP VIEW: STANDARD TABLE --- */}
          {!loading && filteredAccounts.length > 0 && (
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc._id} className="hover:bg-gray-50 transition-colors group">
                      
                      {/* User Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm
                            ${acc.role === 'Admin' ? 'bg-purple-500 text-white' : 
                              acc.role === 'Teacher' ? 'bg-orange-500 text-white' : 
                              acc.role === 'Parent' ? 'bg-teal-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {getInitials(acc.full_name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{acc.full_name}</span>
                            <span className="text-xs text-gray-500">ID: {acc.user_id_number || "N/A"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeStyle(acc.role)}`}>
                          {acc.role}
                        </span>
                      </td>

                      {/* Username Column */}
                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-700">@{acc.username}</span>
                      </td>

                      {/* Status Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${acc.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className={`text-xs font-medium ${acc.is_active ? 'text-green-700' : 'text-red-700'}`}>
                            {acc.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 pl-4">
                           {acc.last_login ? `Last login: ${new Date(acc.last_login).toLocaleDateString()}` : 'Never logged in'}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(acc)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(acc)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --- MOBILE VIEW: CARDS --- */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {!loading && filteredAccounts.map((acc) => (
              <div key={acc._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                
                {/* Card Top */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold 
                      ${acc.role === 'Admin' ? 'bg-purple-100 text-purple-600' : 
                        acc.role === 'Teacher' ? 'bg-orange-100 text-orange-600' : 
                        'bg-blue-100 text-blue-600'}`}>
                      {getInitials(acc.full_name)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{acc.full_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(acc.role)}`}>
                        {acc.role}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(acc)} className="p-1.5 text-gray-400 bg-gray-50 rounded-lg">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(acc)} className="p-1.5 text-red-400 bg-red-50 rounded-lg">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <hr className="border-gray-100 my-3"/>

                {/* Card Details */}
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="block text-gray-400 mb-0.5">Username</span>
                    <span className="font-medium text-gray-700">@{acc.username}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">ID Number</span>
                    <span className="font-medium text-gray-700">{acc.user_id_number || "-"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-400 mb-0.5">Status</span>
                    <span className={`font-bold ${acc.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {acc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </main>

      {/* MODALS */}
      <AccountsEditModal 
        isOpen={isEditAccountModalOpen}
        onClose={() => {
          setIsEditAccountModalOpen(false);
          setSelectedAccount(null);
        }}
        account={selectedAccount}
        onSuccess={fetchAccounts}
      />

      <AccountsDeleteModal 
        isOpen={isDeleteAccountModalOpen}
        onClose={() => {
          setIsDeleteAccountModalOpen(false);
          setSelectedAccount(null);
        }}
        account={selectedAccount}
        onSuccess={fetchAccounts}
      />
    </div>
  );
}