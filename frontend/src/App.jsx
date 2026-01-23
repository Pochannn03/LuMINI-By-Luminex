import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/Landing';
import GuardianRegistration from './pages/auth/GuardianRegistration'
import ParentRegistration from './pages/auth/ParentRegistration';
import TeacherRegistration from './pages/auth/TeacherRegistration';
import SuperAdminDashbooard from './pages/super-admin/SuperAdminDashboard';
import SuperAdminClassManagement from './pages/super-admin/SuperAdminClassManagement';
import AdminDashboard from './pages/admin-teacher/AdminDashboard';
import AdminAttendance from './pages/admin-teacher/AdminAttendance'
import ParentDashboard from './pages/users/parent/ParentDashboard';


export default function App() {
  return (
    <div>
      <Routes>
        
        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/guardian" element={<GuardianRegistration />} />
        <Route path="/register/parent" element={<ParentRegistration />} />
        <Route path="/register/teacher" element={<TeacherRegistration />} />

        {/* Super Admin Routes */}
        <Route path="/superadmin/dashboard" element={<SuperAdminDashbooard />} />
        <Route path="/superadmin/manage-class" element={<SuperAdminClassManagement />} />

        {/* Admin (Teacher) Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />

        {/* User (Parent/Guardian) Routes */}
        <Route path="/dashboard" element={<ParentDashboard />} />

      </Routes>
    </div>
  );
}
