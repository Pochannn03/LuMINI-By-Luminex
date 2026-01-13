import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/Landing';
import GuardianRegistration from './pages/auth/GuardianRegistration'
import ParentRegistration from './pages/auth/ParentRegistration';
import TeacherRegistration from './pages/auth/TeacherRegistration';
import SuperAdminDashbooard from './pages/SuperAdmin/SuperAdminDashboard';
import ClassManagement from './pages/SuperAdmin/ClassManagement';

export default function App() {
  return (
    <div>
      <Routes>
        {/* Auth & Landing */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/guardian" element={<GuardianRegistration />} />
        <Route path="/register/parent" element={<ParentRegistration />} />
        <Route path="/register/teacher" element={<TeacherRegistration />} />

        {/* Admin Routes */}
        <Route path="/superadmin/dashboard" element={<SuperAdminDashbooard />} />
        <Route path="/superadmin/manage-class" element={<ClassManagement />} />
      </Routes>
    </div>
  );
}
