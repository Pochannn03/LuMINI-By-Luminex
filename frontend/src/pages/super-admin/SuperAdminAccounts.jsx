import React, { useState, useEffect, useCallback } from "react";
import axios from 'axios'; 
import { DashboardPendingAccCard } from "../../components/modals/super-admin/dashboard/DashboardPendingAccCard";
import '../../styles/super-admin/class-management.css'; 
import NavBar from "../../components/navigation/NavBar";
import AccountsEditModal from "../../components/modals/super-admin/accounts/AccountsEditModal";
import AccountsDeleteModal from "../../components/modals/super-admin/accounts/AccountsDeleteModal";

export default function SuperAdminAccounts() {
  // MODAL STATES
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  // DATA STATES - Main List
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // DATA STATES - Pending Approvals
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [pendingGuardians, setPendingGuardians] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All"); 

  // --- FETCH MAIN ACCOUNTS LIST ---
  const fetchAccounts = useCallback(async () => {
    setLoading(true); 
    try {
      const response = await axios.get('http://localhost:3000/api/users', { 
        withCredentials: true 
      });

      if (response.data.success) {
        setAccounts(response.data.users || []); 
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- FETCH PENDING APPROVALS (Same as Dashboard) ---
  const fetchPendingAccounts = useCallback(async () => {
    setLoadingPending(true);
    try {
      const response = await axios.get('http://localhost:3000/api/users/cards', { 
        withCredentials: true 
      });

      if (response.data.success) {
        // Assuming your API returns pending_teachers and pending_users (or pending_guardians)
        setPendingTeachers(response.data.pending_teachers || []);
        
        // Check your API response structure. I am mapping 'pending_users' to guardians here
        // based on your dashboard logic where 'users' = Parents.
        setPendingGuardians(response.data.pending_users || []); 
      }
    } catch (error) {
      console.error("Error fetching pending stats:", error);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    fetchAccounts();
    fetchPendingAccounts();
  }, [fetchAccounts, fetchPendingAccounts]);

  // HANDLERS
  const handleEdit = (account) => {
    setSelectedAccount(account);
    setIsEditAccountModalOpen(true);
  };

  const handleDelete = (account) => {
    setSelectedAccount(account);
    setIsDeleteAccountModalOpen(true);
  };

  // Callback when a pending account is approved/declined
  const handlePendingActionComplete = () => {
    fetchPendingAccounts(); // Refresh pending list
    fetchAccounts();        // Refresh main list (newly approved user might appear there)
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // HELPER: Get Badge Color based on Role
  const getRoleBadgeStyle = (role) => {
    if (!role) return 'bg-gray-100 text-gray-700 border-gray-200';
    switch(role) {
      case 'superadmin': 
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': 
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'user': 
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default: 
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const fullName = acc.full_name || `${acc.first_name} ${acc.last_name}`;
    const matchesRole = roleFilter === "All" || (acc.role && acc.role.toLowerCase() === roleFilter.toLowerCase());
    const matchesSearch = 
      (acc.username && acc.username.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (fullName && fullName.toLowerCase().includes(searchQuery.toLowerCase()));
      
    return matchesRole && matchesSearch;
  });

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        
        <div className="superadmin-banner mb-6">
          <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">Accounts Directory</h1>
          <p className="text-[white]! opacity-80 text-[15px]! m-0">View and manage registered users.</p>
        </div>

        <div className="flex flex-col gap-6 max-w-[1200px] m-auto">

          {/* --- NEW SECTION: PENDING APPROVALS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Pending Teachers */}
            <div className="card p-5 border-l-4 border-l-orange-400">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-cdark text-[16px] font-bold">Pending Teachers</h2>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                  {pendingTeachers.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingPending && <p className="text-cgray text-sm">Loading...</p>}
                
                {!loadingPending && pendingTeachers.length === 0 && (
                  <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    <p className="text-cgray text-sm">No pending teachers.</p>
                  </div>
                )}

                {!loadingPending && pendingTeachers.map((tch) => (
                  <DashboardPendingAccCard 
                    key={tch._id || tch.user_id} 
                    tch={tch}
                    onActionComplete={handlePendingActionComplete} // Pass callback if your card supports it
                  />
                ))}
              </div>
            </div>

            {/* 2. Pending Guardians */}
            <div className="card p-5 border-l-4 border-l-blue-400">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-cdark text-[16px] font-bold">Pending Guardians</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                  {pendingGuardians.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingPending && <p className="text-cgray text-sm">Loading...</p>}
                
                {!loadingPending && pendingGuardians.length === 0 && (
                   <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    <p className="text-cgray text-sm">No pending guardians.</p>
                  </div>
                )}

                {!loadingPending && pendingGuardians.map((guardian) => (
                  <DashboardPendingAccCard 
                    key={guardian._id || guardian.user_id} 
                    tch={guardian} // Reusing the same card component
                    onActionComplete={handlePendingActionComplete}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* --- MAIN SEARCH & FILTER BAR --- */}
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

            <div className="relative w-full md:w-auto">
              <select 
                className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:border-blue-500 block pl-3 pr-10 py-2.5 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="admin">Teachers</option>
                <option value="user">Parents & Guardian</option>
                <option value="superadmin">Super Admins</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          {/* --- ACCOUNTS TABLE (Existing Code) --- */}
          {loading && (
            <div className="p-12 text-center text-cgray bg-white rounded-xl border border-gray-100 shadow-sm">
              <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
              <p>Loading Accounts...</p>
            </div>
          )}

          {!loading && filteredAccounts.length === 0 && (
            <div className="p-12 text-center text-cgray bg-white rounded-xl border border-gray-100 shadow-sm">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
              <p>No accounts found.</p>
            </div>
          )}

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
                  {filteredAccounts.map((acc) => {
                    const displayName = acc.full_name || `${acc.first_name} ${acc.last_name}`;
                    return (
                    <tr key={acc._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm
                            ${acc.role === 'superadmin' ? 'bg-purple-500 text-white' : 
                              acc.role === 'admin' ? 'bg-orange-500 text-white' : 
                              acc.role === 'user' ? 'bg-teal-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {getInitials(displayName)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{displayName}</span>
                            <span className="text-xs text-gray-500 mt-0.5">ID: {acc.user_id || "N/A"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeStyle(acc.role)}`}>
                          {acc.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-700">@{acc.username}</span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${!acc.is_archive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className={`text-xs font-medium ${!acc.is_archive ? 'text-green-700' : 'text-red-700'}`}>
                            {!acc.is_archive ? 'Active' : 'Archived'}
                          </span>
                        </div>
                      </td>

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
                  )})}
                </tbody>
              </table>
            </div>
          )}

          <div className="md:hidden grid grid-cols-1 gap-4">
            {!loading && filteredAccounts.map((acc) => (
              <div key={acc._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
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