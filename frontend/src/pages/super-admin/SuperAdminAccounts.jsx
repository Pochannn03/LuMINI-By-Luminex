import React, { useState, useEffect, useCallback } from "react";
import axios from 'axios'; 
import { DashboardPendingAccCard } from "../../components/modals/super-admin/dashboard/DashboardPendingAccCard";
import '../../styles/super-admin/class-management.css'; 
import NavBar from "../../components/navigation/NavBar";
import AccountsEditModal from "../../components/modals/super-admin/accounts/AccountsEditModal";
import AccountsDeleteModal from "../../components/modals/super-admin/accounts/AccountsDeleteModal";
import SuccessModal from "../../components/SuccessModal";

export default function SuperAdminAccounts() {
  const [successConfig, setSuccessConfig] = useState({
    isOpen: false,
    message: ""
  });

  // MODAL STATES
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  // DATA STATES - Main List
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // DATA STATES - Pending Approvals (Unified)
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All"); 
  const [statusFilter, setStatusFilter] = useState("All");

  // PAGINATION STATES - Main Accounts
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  // PAGINATION STATES - Pending Accounts
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const pendingItemsPerPage = 5;

  // --- FETCH MAIN ACCOUNTS LIST (FRONTEND LOGIC) ---
  const fetchAccounts = useCallback(async () => {
    setLoading(true); 
    try {
      // FIX 1: Removed the params so we fetch all approved users, allowing the frontend to sort and paginate perfectly.
      const response = await axios.get('http://localhost:3000/api/users', { 
        withCredentials: true 
      });

      if (response.data.success) {
        const allUsers = Array.isArray(response.data.users) ? response.data.users : [];
        const approvedUsers = allUsers.filter(user => user.is_approved !== false);
        
        setAccounts(approvedUsers); 
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setAccounts([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  // --- FETCH PENDING APPROVALS (Unified) ---
  const fetchPendingAccounts = useCallback(async () => {
    setLoadingPending(true);
    try {
      const response = await axios.get('http://localhost:3000/api/users/cards', { 
        withCredentials: true 
      });

      if (response.data.success) {
        setPendingAccounts(response.data.pending_accounts || []);
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

  // Reset pages when searching or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // HANDLERS
  const isProtectedAccount = (account) => {
    const protectedIds = [0, 1, "0", "1"];
    return protectedIds.includes(account?.user_id);
  };

  const handleEdit = (account) => {
    if (isProtectedAccount(account)) return; 
    setSelectedAccount(account);
    setIsEditAccountModalOpen(true);
  };

  const handleDelete = (account) => {
    if (isProtectedAccount(account)) {
        alert("This root account cannot be deleted.");
        return;
    }
    setSelectedAccount(account);
    setIsDeleteAccountModalOpen(true);
  };
  
  const handleActionSuccess = (msg) => {
    fetchAccounts();
    fetchPendingAccounts();
    
    // Open the success modal with the message provided by the child component
    setSuccessConfig({
      isOpen: true,
      message: typeof msg === 'string' ? msg : "Operation completed successfully!"
    });
  };

  const handlePendingActionComplete = () => {
    fetchPendingAccounts(); 
    fetchAccounts();        
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRoleBadgeStyle = (role) => {
    if (!role) return 'bg-gray-100 text-gray-700 border-gray-200';
    switch(role) {
      case 'superadmin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'user': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // --- FILTERING & SORTING LOGIC (Main Accounts) ---
  const filteredAccounts = accounts.filter((acc) => {
    const fullName = acc.full_name || `${acc.first_name || ''} ${acc.last_name || ''}`;
    const roleString = acc.role ? String(acc.role).toLowerCase() : "";
    const usernameString = acc.username ? String(acc.username).toLowerCase() : "";
    
    const matchesRole = roleFilter === "All" || roleString === roleFilter.toLowerCase();
    const matchesSearch = usernameString.includes(searchQuery.toLowerCase()) || fullName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status Filter Logic
    const matchesStatus = statusFilter === "All" 
      ? true 
      : statusFilter === "Active" 
        ? acc.is_archive === false 
        : acc.is_archive === true;
      
    return matchesRole && matchesSearch && matchesStatus; 
  }).sort((a, b) => {
    // 1. Define the priority of roles
    const rolePriority = {
        'superadmin': 1,
        'admin': 2,
        'user': 3
    };

    // Get the priority number for a and b (default to 4 if role is missing)
    const priorityA = rolePriority[a.role?.toLowerCase()] || 4;
    const priorityB = rolePriority[b.role?.toLowerCase()] || 4;

    // 2. PRIMARY SORT: Compare by Role Priority
    if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower number goes first
    }

    // 3. SECONDARY SORT: If roles are exactly the same, sort Oldest to Newest
    return new Date(a.created_at) - new Date(b.created_at);
  });

  // --- PAGINATION LOGIC (Main Accounts) ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAccounts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);

  // --- PAGINATION LOGIC (Pending Accounts) ---
  const indexOfLastPending = pendingCurrentPage * pendingItemsPerPage;
  const indexOfFirstPending = indexOfLastPending - pendingItemsPerPage;
  const currentPendingItems = pendingAccounts.slice(indexOfFirstPending, indexOfLastPending);
  const totalPendingPages = Math.ceil(pendingAccounts.length / pendingItemsPerPage);

  // --- HELPER FUNCTION: SLIDING PAGE NUMBERS ---
  const generatePageNumbers = (current, total) => {
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        
        <div className="superadmin-banner mb-6">
          <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">Accounts Directory</h1>
          <p className="text-[white]! opacity-80 text-[15px]! m-0">View and manage registered users.</p>
        </div>

        <div className="flex flex-col gap-6 max-w-[1200px] m-auto">
          
          {/* --- MAIN UNIFIED CARD CONTAINER --- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* 1. HEADER: SEARCH & FILTER BAR */}
            <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-gray-200 bg-white">
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

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-auto">
                  <select 
                    className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:border-blue-500 block pl-3 pr-10 py-2.5 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="All">All Roles</option>
                    <option value="admin">Teachers</option>
                    <option value="user">Parents & Guardian</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>

                <div className="relative w-full md:w-auto">
                  <select 
                    className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:border-blue-500 block pl-3 pr-10 py-2.5 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CONTENT AREA */}
            
            {loading && (
              <div className="p-12 text-center text-cgray">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
                <p>Loading Accounts...</p>
              </div>
            )}

            {!loading && filteredAccounts.length === 0 && (
              <div className="p-12 text-center text-cgray">
                 <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
                <p>No accounts found matching your search.</p>
              </div>
            )}

            {!loading && filteredAccounts.length > 0 && (
              <>
                <div className="hidden md:block overflow-x-auto">
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
                      {currentItems.map((acc) => {
                        const displayName = acc.full_name || `${acc.first_name || ''} ${acc.last_name || ''}`;
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
                            <div className="flex items-center justify-end gap-1">
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

                <div className="md:hidden divide-y divide-gray-100">
                  {currentItems.map((acc) => {
                    const displayName = acc.full_name || `${acc.first_name || ''} ${acc.last_name || ''}`;
                    return (
                      <div key={acc._id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold 
                              ${acc.role === 'Admin' ? 'bg-purple-100 text-purple-600' : 
                                acc.role === 'Teacher' ? 'bg-orange-100 text-orange-600' : 
                                'bg-blue-100 text-blue-600'}`}>
                              {getInitials(displayName)}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">{displayName}</h3>
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

                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <div>
                            <span className="block text-gray-400">Username</span>
                            <span className="font-medium text-gray-700">@{acc.username}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400">ID Number</span>
                            <span className="font-medium text-gray-700">{acc.user_id || "-"}</span>
                          </div>
                          <div className="col-span-2 mt-1">
                            <span className={`font-bold inline-flex items-center gap-1 ${!acc.is_archive ? 'text-green-600' : 'text-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${!acc.is_archive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {!acc.is_archive ? 'Active' : 'Archived'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* 3. FOOTER: MAIN ACCOUNTS ADVANCED PAGINATION */}
            {!loading && filteredAccounts.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <span className="text-xs font-medium text-gray-500">
                  Showing page <b>{currentPage}</b> of <b>{totalPages || 1}</b>
                </span>

                <div className="flex gap-1">
                  <button 
                    className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50 flex items-center justify-center rounded-md border border-gray-200" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>

                  {generatePageNumbers(currentPage, totalPages)[0] > 1 && (
                    <>
                      <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-md border border-gray-200" onClick={() => setCurrentPage(1)}>1</button>
                      <span className="px-1 self-center text-gray-400 text-xs">...</span>
                    </>
                  )}

                  {generatePageNumbers(currentPage, totalPages).map(pageNum => (
                    <button 
                      key={pageNum}
                      className={`btn btn-outline h-8 w-8 p-0! transition-colors flex items-center justify-center rounded-md font-medium text-sm ${ currentPage === pageNum  
                          ? 'bg-[#3ab0f9]! text-white! border-[#3ab0f9]! shadow-sm' 
                          : 'hover:bg-blue-50 text-gray-600 border-gray-200'
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {generatePageNumbers(currentPage, totalPages).slice(-1)[0] < totalPages && (
                    <>
                      <span className="px-1 self-center text-gray-400 text-xs">...</span>
                      <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-md border border-gray-200" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                    </>
                  )}

                  <button 
                    className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50 flex items-center justify-center rounded-md border border-gray-200"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* --- PENDING APPROVALS SECTION WITH ADVANCED PAGINATION --- */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-cdark text-[18px] font-bold">Pending Account Approvals</h2>
              </div>
 
              <div className="flex flex-col gap-4">
                {loadingPending && (
                  <p className="text-cgray text-sm p-4 text-center">Loading Pending Accounts...</p>
                )}
 
                {!loadingPending && pendingAccounts.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
                    <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">assignment_turned_in</span>
                    <p className="text-cgray text-sm">No pending accounts found.</p>
                  </div>
                )}
 
                {!loadingPending && currentPendingItems.map((acc) => (
                  <DashboardPendingAccCard 
                    key={acc._id || acc.user_id} 
                    tch={acc} 
                    onSuccess={handlePendingActionComplete}
                  />
                ))}
              </div>

              {/* PENDING ACCOUNTS ADVANCED PAGINATION */}
              {!loadingPending && pendingAccounts.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-gray-500">
                    Showing page <b>{pendingCurrentPage}</b> of <b>{totalPendingPages || 1}</b>
                  </span>
                  
                  <div className="flex gap-1">
                    <button 
                      className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50 flex items-center justify-center rounded-md border border-gray-200" 
                      disabled={pendingCurrentPage === 1}
                      onClick={() => setPendingCurrentPage(prev => prev - 1)}
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>

                    {generatePageNumbers(pendingCurrentPage, totalPendingPages)[0] > 1 && (
                      <>
                        <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-md border border-gray-200" onClick={() => setPendingCurrentPage(1)}>1</button>
                        <span className="px-1 self-center text-gray-400 text-xs">...</span>
                      </>
                    )}

                    {generatePageNumbers(pendingCurrentPage, totalPendingPages).map(pageNum => (
                      <button 
                        key={pageNum}
                        className={`btn btn-outline h-8 w-8 p-0! transition-colors flex items-center justify-center rounded-md font-medium text-sm ${ pendingCurrentPage === pageNum  
                            ? 'bg-[#3ab0f9]! text-white! border-[#3ab0f9]! shadow-sm' 
                            : 'hover:bg-blue-50 text-gray-600 border-gray-200'
                        }`}
                        onClick={() => setPendingCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {generatePageNumbers(pendingCurrentPage, totalPendingPages).slice(-1)[0] < totalPendingPages && (
                      <>
                        <span className="px-1 self-center text-gray-400 text-xs">...</span>
                        <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-md border border-gray-200" onClick={() => setPendingCurrentPage(totalPendingPages)}>{totalPendingPages}</button>
                      </>
                    )}

                    <button 
                      className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50 flex items-center justify-center rounded-md border border-gray-200"
                      disabled={pendingCurrentPage === totalPendingPages || totalPendingPages === 0}
                      onClick={() => setPendingCurrentPage(prev => prev + 1)}
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
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
        onSuccess={handleActionSuccess} 
      />

      <AccountsDeleteModal 
        isOpen={isDeleteAccountModalOpen}
        onClose={() => {
          setIsDeleteAccountModalOpen(false);
          setSelectedAccount(null);
        }}
        account={selectedAccount}
        onSuccess={handleActionSuccess}
      />

      <SuccessModal 
        isOpen={successConfig.isOpen}
        onClose={() => setSuccessConfig(prev => ({ ...prev, isOpen: false }))}
        message={successConfig.message}
      />
    </div>
  );
}