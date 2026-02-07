import { Routes, Route } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import Landing from "./pages/Landing";
import Unauthorized from "./pages/Unauthorized";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import GuardianRegistration from "./pages/auth/GuardianRegistration";
import ParentRegistration from "./pages/auth/ParentRegistration";
import TeacherRegistration from "./pages/auth/TeacherRegistration";
import SuperAdminDashbooard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminClassManagement from "./pages/super-admin/SuperAdminClassManagement";
import SuperAdminAccounts from "./pages/super-admin/SuperAdminAccounts";
import AdminDashboard from "./pages/admin-teacher/AdminDashboard";
import AdminAttendance from "./pages/admin-teacher/AdminAttendance";
import ParentDashboard from "./pages/users/parent/ParentDashboard";
import TeacherProfile from "./pages/admin-teacher/TeacherProfile";
import ParentProfile from "./pages/users/parent/ParentProfile";
import SuperAdminAccounts from "./pages/super-admin/SuperAdminAccounts";

export default function App() {
  return (
    <div>
      <Routes>
        {/* Landing && Unauthorized */}
        <Route path="/" element={<Landing />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/guardian" element={<GuardianRegistration />} />
        <Route path="/register/parent" element={<ParentRegistration />} />
        <Route path="/register/teacher" element={<TeacherRegistration />} />

        {/* Super Admin Routes */}
        <Route element={<RequireAuth allowedRoles={["superadmin"]} />}>
          <Route
            path="/superadmin/dashboard"
            element={<SuperAdminDashbooard />}
          />
          <Route
            path="/superadmin/manage-class"
            element={<SuperAdminClassManagement />}
          />
          <Route path="/superadmin/accounts" element={<SuperAdminAccounts />} />
        </Route>

        {/* Admin (Teacher) Routes */}
        <Route element={<RequireAuth allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/attendance" element={<AdminAttendance />} />
          <Route path="/admin/profile" element={<TeacherProfile />} />
        </Route>

        {/* User (Parent/Guardian) Routes */}
        <Route element={<RequireAuth allowedRoles={["user"]} />}>
          <Route path="/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/profile" element={<ParentProfile />} />
        </Route>
      </Routes>
    </div>
  );
}
