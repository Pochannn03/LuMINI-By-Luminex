import React, { useState, useEffect, useCallback } from "react";
import axios from 'axios'; 
import { DashboardPendingAccCard } from "../../components/modals/super-admin/dashboard/DashboardPendingAccCard";
import '../../styles/super-admin/class-management.css'; 
import NavBar from "../../components/navigation/NavBar";
import AccountsEditModal from "../../components/modals/super-admin/accounts/AccountsEditModal";
import AccountsDeleteModal from "../../components/modals/super-admin/accounts/AccountsDeleteModal";
import SuccessModal from "../../components/SuccessModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

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

  // DATA STATES - Pending Approvals
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All"); 
  const [statusFilter, setStatusFilter] = useState("All");

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const pendingItemsPerPage = 5;

  // --- FETCH MAIN ACCOUNTS LIST ---
  const fetchAccounts = useCallback(async () => {
    setLoading(true); 
    try {
      // Updated to use BACKEND_URL
      const response = await axios.get(`${BACKEND_URL}/api/users`, { 
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

  // --- FETCH PENDING APPROVALS ---
  const fetchPendingAccounts = useCallback(async () => {
    setLoadingPending(true);
    try {
      // Updated to use BACKEND_URL
      const response = await axios.get(`${BACKEND_URL}/api/users/cards`, { 
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

  useEffect(() => {
    fetchAccounts();
    fetchPendingAccounts();
  }, [fetchAccounts, fetchPendingAccounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

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
    setSuccessConfig({
      isOpen: true,
      message: typeof msg === 'string' ? msg : "Operation completed successfully!"
    });
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

  const filteredAccounts = accounts.filter((acc) => {
    const displayName = acc.full_name || `${acc.first_name || ''} ${acc.last_name || ''}`;
    const matchesRole = roleFilter === "All" || String(acc.role).toLowerCase() === roleFilter.toLowerCase();
    const matchesSearch = acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) || displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" ? true : statusFilter === "Active" ? acc.is_archive === false : acc.is_archive === true;
    return matchesRole && matchesSearch && matchesStatus; 
  }).sort((a, b) => {
    const rolePriority = { 'superadmin': 1, 'admin': 2, 'user': 3 };
    const priorityA = rolePriority[a.role?.toLowerCase()] || 4;
    const priorityB = rolePriority[b.role?.toLowerCase()] || 4;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(a.created_at) - new Date(b.created_at);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredAccounts.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);

  const currentPendingItems = pendingAccounts.slice((pendingCurrentPage * pendingItemsPerPage) - pendingItemsPerPage, pendingCurrentPage * pendingItemsPerPage);
  const totalPendingPages = Math.ceil(pendingAccounts.length / pendingItemsPerPage);

  const generatePageNumbers = (current, total) => {
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-gray-200 bg-white">
              <div className="search-bar-small flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 w-full md:max-w-md">
                <span className="material-symbols-outlined text-gray-400">search</span>
                <input type="text" placeholder="Search by name or username..." className="bg-transparent border-none outline-none w-full text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-auto">
                  <select className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg pl-3 pr-10 py-2.5 outline-none cursor-pointer" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="All">All Roles</option>
                    <option value="admin">Teachers</option>
                    <option value="user">Parents & Guardian</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><span className="material-symbols-outlined text-[20px]">expand_more</span></div>
                </div>
                <div className="relative w-full md:w-auto">
                  <select className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg pl-3 pr-10 py-2.5 outline-none cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><span className="material-symbols-outlined text-[20px]">expand_more</span></div>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="p-12 text-center text-cgray"><span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span><p>Loading Accounts...</p></div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-12 text-center text-cgray"><span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span><p>No accounts found.</p></div>
            ) : (
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
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm ${acc.role === 'superadmin' ? 'bg-purple-500 text-white' : acc.role === 'admin' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>{getInitials(displayName)}</div>
                              <div className="flex flex-col"><span className="text-sm font-semibold text-gray-900">{displayName}</span><span className="text-xs text-gray-500 mt-0.5">ID: {acc.user_id || "N/A"}</span></div>
                            </div>
                          </td>
                          <td className="p-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeStyle(acc.role)}`}>{acc.role}</span></td>
                          <td className="p-4"><span className="text-sm font-medium text-gray-700">@{acc.username}</span></td>
                          <td className="p-4"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${!acc.is_archive ? 'bg-green-500' : 'bg-red-500'}`}></span><span className={`text-xs font-medium ${!acc.is_archive ? 'text-green-700' : 'text-red-700'}`}>{!acc.is_archive ? 'Active' : 'Archived'}</span></div></td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEdit(acc)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                              <button onClick={() => handleDelete(acc)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
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
                      <div key={acc._id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${acc.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{getInitials(displayName)}</div>
                            <div><h3 className="text-sm font-bold text-gray-900">{displayName}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(acc.role)}`}>{acc.role}</span></div>
                          </div>
                          <div className="flex gap-1"><button onClick={() => handleEdit(acc)} className="p-1.5 text-gray-400 bg-gray-50 rounded-lg"><span className="material-symbols-outlined text-[18px]">edit</span></button><button onClick={() => handleDelete(acc)} className="p-1.5 text-red-400 bg-red-50 rounded-lg"><span className="material-symbols-outlined text-[18px]">delete</span></button></div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs"><div><span className="block text-gray-400">Username</span><span className="font-medium">@{acc.username}</span></div><div><span className="block text-gray-400">ID</span><span className="font-medium">{acc.user_id || "-"}</span></div></div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {!loading && filteredAccounts.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500">Page <b>{currentPage}</b> of <b>{totalPages}</b></span>
                <div className="flex gap-1">
                  <button className="btn btn-outline h-8 w-8 p-0 flex items-center justify-center rounded-md border" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                  {generatePageNumbers(currentPage, totalPages).map(pageNum => (<button key={pageNum} className={`h-8 w-8 rounded-md text-sm ${currentPage === pageNum ? 'bg-blue-500 text-white' : 'border'}`} onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>))}
                  <button className="btn btn-outline h-8 w-8 p-0 flex items-center justify-center rounded-md border" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-cdark text-[18px] font-bold mb-4">Pending Account Approvals</h2>
              <div className="flex flex-col gap-4">
                {loadingPending ? (<p className="text-center p-4">Loading...</p>) : pendingAccounts.length === 0 ? (<div className="text-center py-8 border-dashed border border-gray-200 rounded-lg"><p className="text-gray-400">No pending accounts.</p></div>) : (currentPendingItems.map((acc) => (<DashboardPendingAccCard key={acc._id} tch={acc} onSuccess={handleActionSuccess} />)))}
              </div>
              {!loadingPending && pendingAccounts.length > 0 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t"><span className="text-xs">Page <b>{pendingCurrentPage}</b> of <b>{totalPendingPages}</b></span><div className="flex gap-1"><button className="border rounded h-8 w-8" disabled={pendingCurrentPage === 1} onClick={() => setPendingCurrentPage(p => p - 1)}><span className="material-symbols-outlined text-[16px]">chevron_left</span></button><button className="border rounded h-8 w-8" disabled={pendingCurrentPage === totalPendingPages} onClick={() => setPendingCurrentPage(p => p + 1)}><span className="material-symbols-outlined text-[16px]">chevron_right</span></button></div></div>
              )}
            </div>
          </div>
        </div>
      </main>
      <AccountsEditModal isOpen={isEditAccountModalOpen} onClose={() => setIsEditAccountModalOpen(false)} account={selectedAccount} onSuccess={handleActionSuccess} />
      <AccountsDeleteModal isOpen={isDeleteAccountModalOpen} onClose={() => setIsDeleteAccountModalOpen(false)} account={selectedAccount} onSuccess={handleActionSuccess} />
      <SuccessModal isOpen={successConfig.isOpen} onClose={() => setSuccessConfig(p => ({ ...p, isOpen: false }))} message={successConfig.message} />
    </div>
  );
}