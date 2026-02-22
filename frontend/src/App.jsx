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
import SuperAdminAnalytics from "./pages/super-admin/SuperAdminAnalytics"; 
import AdminDashboard from "./pages/admin-teacher/AdminDashboard";
import AdminAttendance from "./pages/admin-teacher/AdminAttendance";
import AdminDropAndPickHistory from "./pages/admin-teacher/AdminDropAndPickHistory";
import ParentDashboard from "./pages/users/parent/ParentDashboard";
import TeacherProfile from "./pages/admin-teacher/TeacherProfile";
import ParentProfile from "./pages/users/parent/ParentProfile";
import SuperAdminQrCodeGate from "./pages/super-admin/SuperAdminQrCodeGate";
import ManageGuardians from "./pages/users/parent/ParentManageGuardian";
import ManageApprovals from "./pages/admin-teacher/ManageApprovals";
import GuardianSetup from "./pages/users/guardian/GuardianSetup";
import GuardianProfile from "./pages/users/guardian/GuardianProfile";
import GuardianDashboard from "./pages/users/guardian/GuardianDashboard";
import PickupAndDropoffHistory from "./pages/users/parent/ParentPickupAndDropoffHistory";
import ParentEnrollment from "./pages/ParentEnrollment";
import EnrollmentApproval from "./pages/admin-teacher/EnrollmentApproval";

export default function App() {
  return (
    <div>
      <Routes>
        {/* Landing && Unauthorized */}
        <Route path="/" element={<Landing />} />
        {/* --- NEW ROUTE --- */}
        <Route path="/enroll" element={<ParentEnrollment />} />
        {/* ----------------- */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/guardian" element={<GuardianRegistration />} />
        <Route path="/register/parent" element={<ParentRegistration />} />
        <Route path="/register/teacher" element={<TeacherRegistration />} />

        {/* Super Admin Pages */}
        <Route element={<RequireAuth allowedRoles={["superadmin"]} />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashbooard />} />
          <Route path="/superadmin/manage-class" element={<SuperAdminClassManagement />} />
          <Route path="/superadmin/accounts" element={<SuperAdminAccounts />} />
          <Route path="/superadmin/qr-gate" element={<SuperAdminQrCodeGate />} />
          <Route path="/superadmin/analytics" element={<SuperAdminAnalytics />} />
        </Route>

        {/* Admin (Teacher) Pages */}
        <Route element={<RequireAuth allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/attendance" element={<AdminAttendance />} />
          <Route path="/admin/history" element={<AdminDropAndPickHistory />} />
          <Route path="/admin/profile" element={<TeacherProfile />} />
          <Route path="/admin/approvals" element={<ManageApprovals />} />
          <Route path="/admin/enrollments" element={<EnrollmentApproval />} />
        </Route>

        {/* User (Parent) Routes */}
        <Route
          element={
            <RequireAuth allowedRoles={["user"]} allowedTypes={["Parent"]} />
          }
        >
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/profile" element={<ParentProfile />} />
          <Route path="/parent/guardians" element={<ManageGuardians />} />
          <Route path="/parent/history" element={<PickupAndDropoffHistory />} />
        </Route>

        {/* User (Guardian) Routes */}
        <Route
          element={
            <RequireAuth allowedRoles={["user"]} allowedTypes={["Guardian"]} />
          }
        >
          {/* --- NEW: GUARDIAN SETUP BUFFER ZONE --- */}
          <Route path="/guardian/setup" element={<GuardianSetup />} />
          <Route path="/guardian/dashboard" element={<GuardianDashboard />} /> 
          <Route path="/guardian/profile" element={<GuardianProfile />} /> 
        </Route>

        {/* SHARED ROUTE OF USER */}
        <Route element={<RequireAuth allowedRoles={["user"]} />}>
          {/* Example: A settings page common to both */}
          {/* <Route path="/user/settings" element={<UserSettings />} /> */}
        </Route>
      </Routes>
    </div>
  );
}