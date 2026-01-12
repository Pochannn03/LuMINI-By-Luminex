import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/Landing';
import GuardianRegistration from './pages/auth/GuardianRegistration'
import ParentRegistration from './pages/auth/ParentRegistration';
import TeacherRegistration from './pages/auth/TeacherRegistration';
import SuperAdminDashbooard from './pages/SuperAdmin/SuperAdminDashboard';

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/guardian" element={<GuardianRegistration />} />
        <Route path="/register/parent" element={<ParentRegistration />} />
        <Route path="/register/teacher" element={<TeacherRegistration />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashbooard />} />
      </Routes>
    </div>
  );
}
